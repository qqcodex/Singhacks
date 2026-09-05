"""
Prioritization agent: turns a book of clients with structured risk/liquidity
signals (from src/data_layer/signals.py) into a ranked "who does the RM call
first" list, with defensible reasoning attached to every rank.

Design choice: severity scoring is done in code (signals.py), NOT by the LLM.
The LLM's job is to weigh multiple flags per client into one ranking and
explain the ranking in the RM's language — it does not invent risk scores.
This keeps the ranking auditable: every severity number traces back to a
csv row, and Gemini is only asked to reason over numbers it was given.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from llm_client import generate_json  # noqa: E402

SYSTEM_INSTRUCTION = """You are the prioritization assistant for a private bank Relationship
Manager who covers 20 clients. You are given, for each flagged client, their AUM, risk
profile, and a list of pre-computed risk/liquidity flags with severities (0-1, computed
by the data system, not by you).

Your job: rank clients by how urgently the RM should reach out, and explain why in one or
two plain-English sentences per client, referencing the actual flags given.

Rules:
- Do not invent flags, numbers, or events not present in the input.
- Weigh combinations, not just counts: a client with one severe flag (e.g. a fund gated for
  three quarters AND a real cash shortfall) usually outranks a client with several mild,
  borderline mandate breaches that are a rounding matter.
- A single-position breach only slightly over its cap (e.g. 12.2% vs a 12% cap) is low
  urgency by itself. A position at 2x or more its cap, or a breach combined with a
  liquidity or gating flag, is high urgency.
- AUM IS a factor, but as a multiplier on severity, not a ranking criterion on its own:
  the same percentage shortfall or breach represents a larger absolute dollar problem, and
  a larger client relationship, on a bigger book. Use each client's aum_usd together with
  the dollar figures already stated in the flag details (e.g. a liquidity shortfall in USD)
  to judge real-world impact — do not simply rank by aum_usd, and do not ignore it either.
  Two clients with an equally severe breach should generally rank with the larger book
  ahead, unless the smaller client's flags are qualitatively more urgent (e.g. gating,
  margin call proximity).
- A small account with a severe, multi-flag problem (gating + liquidity gap + a severe
  breach) can still outrank a much larger account that only has one mild, borderline
  breach.
- Output a rank order (1 = call first) and, for each client, a short "why" and a
  recommended first talking point. The "why" should make the AUM/dollar-impact reasoning
  visible when it influenced the rank, not just cite percentages.
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "ranked_clients": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string"},
                    "name": {"type": "string"},
                    "rank": {"type": "integer"},
                    "urgency": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                    "why": {"type": "string"},
                    "recommended_first_talking_point": {"type": "string"},
                },
                "required": ["client_id", "name", "rank", "urgency", "why", "recommended_first_talking_point"],
            },
        }
    },
    "required": ["ranked_clients"],
}


def prioritize(signal_bundles: dict[str, dict], top_n: int | None = None) -> dict:
    """
    signal_bundles: output of signals.build_signals() — {client_id: {name, aum_usd,
        risk_profile, life_stage, flags: [{type, severity, detail}, ...]}}
    top_n: if set, ask the model to only return the top N (still ranked 1..N).
    """
    payload = list(signal_bundles.values())
    n_clause = f"Return only the top {top_n} clients." if top_n else "Rank all clients given."

    prompt = f"""Here are this RM's flagged clients and their pre-computed signals:

{json.dumps(payload, indent=2)}

{n_clause}"""

    return generate_json(
        prompt=prompt,
        response_schema=RESPONSE_SCHEMA,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.1,
    )


if __name__ == "__main__":
    # Run against the real dataset's computed signals.
    signals_path = Path(__file__).resolve().parents[2] / "sample_signals.json"
    if not signals_path.exists():
        print(f"Run `python src/data_layer/signals.py <path-to-data-root>` first to generate {signals_path}")
        sys.exit(1)

    with open(signals_path) as f:
        bundles = json.load(f)

    result = prioritize(bundles, top_n=5)
    print(json.dumps(result, indent=2))
