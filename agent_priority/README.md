# Priority Agent — backend

A small FastAPI service. It does two things:

1. **Deterministic scoring** (`scoring.py`) — recomputes the full 20-client priority
   ranking straight from the dataset (`../data/*.csv`, `rm_notes.json`) on every request.
   No LLM involved; this is what your dashboard should fetch for the "overview of all
   clients" view.
2. **The actual AI agent** (`POST /ask`) — calls the real Claude API, grounded in that
   same computed data, to answer free-text questions and defend the ranking with
   citations. The model may only choose *which* client IDs are relevant; the client
   records returned always come straight from `scoring.py`, never from anything the
   model said — so a hallucinated number can never reach the caller.

## Run it

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...        # Windows (cmd): set ANTHROPIC_API_KEY=...
uvicorn main:app --reload --port 8000
```

`/priorities`, `/priorities/{id}`, `/alerts`, and `/health` work with **no API key** —
only `/ask` needs one. Without a key, `/ask` returns a clean `503` instead of crashing.

## Endpoints

### `GET /health`
```json
{"status": "ok"}
```

### `GET /priorities?an_weight=60`
The full ranked book — this is what your dashboard fetches for the overview.
`an_weight` is 0–100 (Attention Need's share of the score; Client Value gets the
rest). Defaults to 60, matching the framework's 40/60 split. Response shape:

```jsonc
{
  "generated_for": "Priscilla Ong, RM-SG-014, Asia desk (Singapore & Hong Kong)",
  "as_of": "2026-08-26",
  "weights": {"client_value": 0.4, "attention_need": 0.6},
  "clients": [
    {
      "rank": 1,
      "client_id": "CL-0014",
      "client_name": "Lau Chi Ming",
      "wealth_band": "UHNW",
      "life_stage": "Peak earning years",
      "total_aum_usd": 26488971.0,
      "overall_priority": 69.5,
      "client_value_score": 64.0,
      "attention_need_score": 73.1,
      "client_value_breakdown": { "aum_percentile": 50.0, "managed_share_pct": 100.0, "growth_potential": 40, "tenure_years": 15.4 },
      "attention_need_breakdown": { "collateral_score": 97.6, "liquidity_score": 40.5, "kyc_score": 77.5, "contact_score": 0.0, "mandate_score": 100.0, "qualitative_score": 85.0 },
      "evidence": { "min_headroom_to_margin_call_pct": 0.6, "facility_breached_in_period": false, "near_term_liquidity_claim_usd": 7682458.0, "liquid_daily_aum_usd": 11376114.0, "kyc_review_due": "2026-09-22", "kyc_days_until_due": 27, "days_since_last_contact": 15, "mandate_breach_count": 4 },
      "mandate_breaches": [ { "portfolio_name": "Advisory Balanced Portfolio", "asset_class": "Equity", "weight_pct": 23.4, "min_pct": 30, "max_pct": 55.0 } ],
      "qualitative_flags": [ { "tag": "Hidden look-through concentration", "severity": 85, "text": "...", "source": "rm_notes N-018" } ],
      "recommended_actions": [ "Show the four-way exposure on one page and decide which leg comes off first." ]
    }
  ]
}
```

### `GET /priorities/{client_id}`
Same shape as one entry above. `404` if the ID isn't in the book.

### `GET /alerts`
Deterministic, no LLM — margin-call risk, overdue KYC, severity ≥ 85 flags, clients
with 3+ open mandate breaches, sorted most-severe first:
```json
{"as_of": "2026-08-26", "alerts": [{"key": "CL-0014:margin", "severity": 96, "title": "Margin-call risk", "client_id": "CL-0014", "client_name": "Lau Chi Ming", "detail": "0.6pt headroom left"}]}
```

### `POST /ask`
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Who should I call this week, and why?"}'
```
```json
{
  "answer": "Lau Chi Ming and Tan Boon Huat top the list...",
  "client_ids": ["CL-0014", "CL-0011"],
  "clients": [ /* full records for those IDs, same shape as /priorities */ ]
}
```

Optional body fields:
- `history`: `[{"role": "user"|"assistant", "content": "..."}]` — pass back the prior
  turns to keep a conversation going (the API itself is stateless).
- `an_weight`: same 0–100 weight as `/priorities`, in case you want the agent to reason
  against a re-weighted book.

## Fetching from your dashboard

```js
const res = await fetch("http://localhost:8000/priorities");
const book = await res.json();   // book.clients is the array to render
```

CORS is wide open (`allow_origins=["*"]`) for the hackathon. Lock this down to your
dashboard's actual origin in `main.py` before this runs anywhere real.

## Notes

- `scoring.py` recomputes from the CSVs on every request — for 20 clients this is
  well under 100ms, so no caching layer was added. If the dataset grows, cache
  `build_book()`'s result and invalidate on a timer or on file change.
- The qualitative flags and their severities in `scoring.py` were hand-reviewed from
  `rm_notes.json` (not generated) — see the `QUALITATIVE_FLAGS` dict if you need to
  add or adjust one for the demo.
