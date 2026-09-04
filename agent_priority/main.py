"""
Priority Agent — backend service.

Serves the deterministic, evidence-based client-priority ranking as JSON
(for the dashboard teammate to fetch) and exposes an /ask endpoint that
calls the real Claude API, grounded in that same computed data, to answer
natural-language questions and defend the ranking with citations.

Run:
    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...      # (Windows: set ANTHROPIC_API_KEY=...)
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /health
    GET  /priorities?an_weight=60            -> full ranked client book (JSON)
    GET  /priorities/{client_id}             -> single client's record
    GET  /alerts                             -> proactive risk alerts (no LLM)
    POST /ask   {"question": "..."}          -> {"answer", "client_ids", "clients"}
"""
import os
from typing import List, Optional

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import scoring

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

app = FastAPI(title="Priority Agent", version="1.0")

# Hackathon default: allow any origin so the dashboard teammate can fetch
# from wherever it's hosted. Restrict this to your dashboard's actual
# origin before this touches anything real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Deterministic endpoints — no LLM, always available, always the same shape
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/priorities")
def get_priorities(an_weight: int = 60):
    """Full ranked book. an_weight is 0-100 (Attention Need's share); Client
    Value gets the remainder. Defaults to the framework's 40/60 split."""
    an_weight = max(0, min(100, an_weight))
    book = scoring.build_book(DATA_DIR, cv_weight=(100 - an_weight) / 100, an_weight=an_weight / 100)
    return book


@app.get("/priorities/{client_id}")
def get_priority(client_id: str, an_weight: int = 60):
    an_weight = max(0, min(100, an_weight))
    book = scoring.build_book(DATA_DIR, cv_weight=(100 - an_weight) / 100, an_weight=an_weight / 100)
    for c in book["clients"]:
        if c["client_id"] == client_id:
            return c
    raise HTTPException(status_code=404, detail=f"No client {client_id!r} in the book.")


@app.get("/alerts")
def get_alerts():
    book = scoring.build_book(DATA_DIR)
    return {"as_of": book["as_of"], "alerts": scoring.compute_alerts(book)}


# ---------------------------------------------------------------------------
# /ask — the actual AI agent. Grounded strictly in the computed book above;
# the model may only choose WHICH clients are relevant and write the prose
# explanation. The client records returned always come from scoring.py,
# never from anything the model said, so a hallucinated number can't reach
# the caller.
# ---------------------------------------------------------------------------

LEADING_PROMPT_TEMPLATE = """You are the prioritisation agent for Julius Baer's Asia-desk relationship \
manager, Priscilla Ong (RM-SG-014, Singapore & Hong Kong booking centres). Below is her complete, \
already-scored client book: every client has a deterministic Client Value score, Attention Need score \
and Overall Priority (0-100, higher means needs attention sooner), named sub-signal breakdowns, hard \
evidence (credit facility headroom across five dated snapshots, liquidity coverage, KYC deadlines, \
mandate and concentration breaches) and qualitative flags drawn from her own RM notes, each citing its \
rm_notes ID or source file.

This data is authoritative and complete. Never invent a client, a number, a note, or a fact that is not \
in it. When you state a fact, name the field, facility, or citation it came from. If the data does not \
support an answer, say so plainly rather than guessing.

Read the RM's question, decide which clients (if any) are relevant, and answer in a way she could repeat \
to the client or defend to a compliance reviewer: concrete, cited, and honest about uncertainty. A \
waived, client-directed breach is materially different from an undisclosed one — preserve that \
distinction.

CLIENT BOOK (JSON):
{book_json}
"""


class AgentAnswer(BaseModel):
    answer: str
    client_ids: List[str]


class Turn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AskRequest(BaseModel):
    question: str
    history: Optional[List[Turn]] = None
    an_weight: int = 60


class AskResponse(BaseModel):
    answer: str
    client_ids: List[str]
    clients: list


def _client():
    """Anthropic() picks up ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / an
    `ant auth login` profile automatically — never hardcode a key here."""
    return anthropic.Anthropic()


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    an_weight = max(0, min(100, req.an_weight))
    book = scoring.build_book(DATA_DIR, cv_weight=(100 - an_weight) / 100, an_weight=an_weight / 100)
    by_id = {c["client_id"]: c for c in book["clients"]}

    system_prompt = LEADING_PROMPT_TEMPLATE.format(book_json=_compact_json(book["clients"]))

    messages = []
    for turn in (req.history or []):
        if turn.role not in ("user", "assistant"):
            raise HTTPException(status_code=400, detail="history roles must be 'user' or 'assistant'")
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": req.question})

    try:
        client = _client()
        response = client.messages.parse(
            model="claude-opus-5",
            max_tokens=2000,
            system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
            messages=messages,
            output_format=AgentAnswer,
        )
    except (anthropic.AuthenticationError, TypeError) as e:
        # TypeError: the SDK raises this synchronously (not an API response)
        # when no credential source resolves at all — no key, no auth token,
        # no `ant auth login` profile. Treat it the same as a rejected key.
        if isinstance(e, TypeError) and "authentication" not in str(e).lower():
            raise
        raise HTTPException(
            status_code=503,
            detail="No valid Anthropic API key configured. Set ANTHROPIC_API_KEY (or run `ant auth login`) "
                   "on the machine running this backend.",
        )
    except anthropic.RateLimitError as e:
        retry_after = e.response.headers.get("retry-after", "60") if getattr(e, "response", None) else "60"
        raise HTTPException(status_code=429, detail=f"Rate limited by Anthropic. Retry after {retry_after}s.")
    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {e.message}")
    except anthropic.APIConnectionError:
        raise HTTPException(status_code=502, detail="Could not reach the Anthropic API.")

    parsed = response.parsed_output
    ids = [cid for cid in parsed.client_ids if cid in by_id][:6]
    return AskResponse(answer=parsed.answer, client_ids=ids, clients=[by_id[cid] for cid in ids])


def _compact_json(obj) -> str:
    import json
    return json.dumps(obj, default=str)
