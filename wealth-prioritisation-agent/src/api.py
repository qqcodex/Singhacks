"""
Tiny local API so a dashboard can fetch the prioritization agent's ranked
output over HTTP, and so the RM can approve/dismiss/modify a ranking (the
"human in the loop" control the challenge brief explicitly asks for).

Run it:
    python3 src/api.py
    -> serves on http://localhost:8000

Auth:
    Every /api/* endpoint requires a shared secret header:
        X-API-Key: <value of API_SHARED_SECRET from .env>
    This is NOT your Gemini key — it's a separate secret only your dashboard
    needs to know, so the Gemini key itself never has to leave this service.
    Generate one yourself, e.g.: python3 -c "import secrets; print(secrets.token_urlsafe(32))"

Endpoints:
    GET  /api/prioritized-clients           -> ranked list, with any RM overrides applied
    GET  /api/prioritized-clients?top_n=20  -> rank all flagged clients
    GET  /api/signals                        -> raw signal bundles (the evidence)
    POST /api/prioritized-clients/{client_id}/review
                                              -> RM records approve / dismiss / modify
                                                 on one client's ranking, with a reason
    GET  /api/review-log                     -> full audit trail of every RM decision
    GET  /health                             -> liveness check, no auth required

Caching: the Gemini ranking is cached in memory after the first request (real
API calls otherwise fire on every request). Call with ?refresh=true to force
a fresh Gemini call, e.g. after regenerating sample_signals.json.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

load_dotenv()

sys.path.append(str(Path(__file__).resolve().parent))
sys.path.append(str(Path(__file__).resolve().parent / "agents"))
from agents.prioritization_agent import prioritize  # noqa: E402

SIGNALS_PATH = Path(__file__).resolve().parents[1] / "sample_signals.json"
REVIEW_LOG_PATH = Path(__file__).resolve().parents[1] / "review_log.json"

# --- security -----------------------------------------------------------
# A separate shared secret, not the Gemini key, so the Gemini key never has
# to be given to the dashboard or any other consumer of this API. Everyone
# calling this service (your friend's dashboard included) needs this value.
_API_SHARED_SECRET = os.environ.get("API_SHARED_SECRET")

# Which origins are allowed to call this from a browser. Comma-separated in
# .env, e.g. ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
# Defaults to "no browser origins allowed" rather than "*" if unset, so a
# missing config fails closed, not open.
_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(key: str | None = Security(_api_key_header)):
    if not _API_SHARED_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Server misconfigured: API_SHARED_SECRET is not set in .env. "
                    "Refusing to serve requests with no auth configured at all.",
        )
    if key != _API_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Missing or invalid X-API-Key header.")
    return True


app = FastAPI(title="Wealth Intelligence — Prioritization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,  # empty list = no browser origin allowed by default
    allow_methods=["GET", "POST"],
    allow_headers=["X-API-Key", "Content-Type"],
)

_cache: dict = {}


def _load_signals() -> dict:
    with open(SIGNALS_PATH) as f:
        return json.load(f)


def _load_review_log() -> dict:
    if REVIEW_LOG_PATH.exists():
        with open(REVIEW_LOG_PATH) as f:
            return json.load(f)
    return {}


def _save_review_log(log: dict) -> None:
    REVIEW_LOG_PATH.write_text(json.dumps(log, indent=2))


def _apply_reviews(ranked_result: dict, review_log: dict) -> dict:
    """
    Overlay RM decisions onto the model's ranking. A dismissed client is kept
    in the payload (never silently deleted — that would hide the AI's
    original judgment from an audit) but flagged so the UI can grey it out /
    move it down. A modified client gets the RM's own urgency/note attached
    alongside the model's original call, so both are visible.
    """
    reviews_by_client = review_log
    for entry in ranked_result.get("ranked_clients", []):
        cid = entry["client_id"]
        review = reviews_by_client.get(cid)
        entry["ai_original_urgency"] = entry["urgency"]
        entry["ai_original_why"] = entry["why"]
        if review:
            entry["rm_decision"] = review["decision"]
            entry["rm_note"] = review.get("note", "")
            entry["rm_id"] = review.get("rm_id", "")
            entry["rm_reviewed_at"] = review["timestamp"]
            if review["decision"] == "dismiss":
                entry["urgency"] = "dismissed_by_rm"
            elif review["decision"] == "modify" and review.get("new_urgency"):
                entry["urgency"] = review["new_urgency"]
        else:
            entry["rm_decision"] = "pending_review"
    return ranked_result


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/signals", dependencies=[Depends(require_api_key)])
def get_signals():
    """Raw, pre-LLM signal bundles — the evidence the ranking is based on."""
    return _load_signals()


@app.get("/api/prioritized-clients", dependencies=[Depends(require_api_key)])
def get_prioritized_clients(
    top_n: int = Query(default=5, ge=1, le=20),
    refresh: bool = Query(default=False, description="force a fresh Gemini call instead of using the cache"),
):
    cache_key = top_n
    if refresh or cache_key not in _cache:
        signals = _load_signals()
        _cache[cache_key] = prioritize(signals, top_n=top_n)

    # re-apply the review log fresh on every request (not cached), so an RM
    # decision shows up immediately without needing a new Gemini call.
    result = json.loads(json.dumps(_cache[cache_key]))  # cheap deep copy
    return _apply_reviews(result, _load_review_log())


class ReviewRequest(BaseModel):
    decision: Literal["approve", "dismiss", "modify"]
    rm_id: str
    note: str = ""
    new_urgency: Literal["critical", "high", "medium", "low"] | None = None


@app.post("/api/prioritized-clients/{client_id}/review", dependencies=[Depends(require_api_key)])
def review_client(client_id: str, body: ReviewRequest):
    """
    Record an RM's decision on one client's AI-generated ranking: approve it
    as-is, dismiss it (the RM judges it's not actually urgent), or modify it
    (override the urgency level). This is the human-in-the-loop control point
    — the AI proposes, the RM disposes, and every decision is logged with who
    made it and when for audit/compliance purposes.
    """
    log = _load_review_log()
    log[client_id] = {
        "decision": body.decision,
        "rm_id": body.rm_id,
        "note": body.note,
        "new_urgency": body.new_urgency,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _save_review_log(log)
    return {"status": "recorded", "client_id": client_id, "entry": log[client_id]}


@app.get("/api/review-log", dependencies=[Depends(require_api_key)])
def get_review_log():
    """Full audit trail: every RM decision on every client ranking, with timestamps."""
    return _load_review_log()


if __name__ == "__main__":
    import uvicorn
    if not _API_SHARED_SECRET:
        print(
            "WARNING: API_SHARED_SECRET is not set in .env — every request will be "
            "rejected with 401 until you set one. Generate one with:\n"
            "  python3 -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
        )
    uvicorn.run(app, host="0.0.0.0", port=8000)
