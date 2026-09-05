"""
Data layer for the prioritization agent.

Scans the five-snapshot dataset and produces one structured "signal bundle"
per client: everything a human RM would want to weigh before deciding who to
call first. This module does NO reasoning and calls NO LLM — it only computes
facts and severities from the CSVs, so every number the prioritization agent
sees is auditable back to a source row.

Run standalone to regenerate data/signals.json:
    python src/data_layer/signals.py /path/to/singhacks-jb-wealth-intelligence
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Any


def _load(data_dir: Path, name: str) -> list[dict]:
    with open(data_dir / f"{name}.csv") as f:
        return list(csv.DictReader(f))


def _load_json(data_dir: Path, name: str) -> Any:
    with open(data_dir / f"{name}.json") as f:
        return json.load(f)


def build_signals(data_dir: Path, current_snapshot: str = "2026-08-26") -> dict[str, dict]:
    clients = _load(data_dir, "clients")
    portfolios = _load(data_dir, "portfolios")
    mandates = _load(data_dir, "mandates")
    credit = _load(data_dir, "credit_facilities")
    commitments = _load(data_dir, "commitments")
    holdings = _load(data_dir, "holdings")
    notes = _load_json(data_dir, "rm_notes")

    mandate_by_code: dict[str, list[dict]] = {}
    for m in mandates:
        mandate_by_code.setdefault(m["mandate_code"], []).append(m)

    signals = {
        c["client_id"]: {
            "client_id": c["client_id"],
            "name": c["client_name"],
            "aum_usd": float(c["total_aum_usd"]),
            "risk_profile": c["risk_profile"],
            "life_stage": c["life_stage"],
            "flags": [],  # list of {type, severity (0-1), detail}
        }
        for c in clients
    }

    # --- single-position mandate breaches, magnitude-aware ---
    pf_client = {p["portfolio_id"]: p["client_id"] for p in portfolios}
    for pf in portfolios:
        cid = pf["client_id"]
        bands = mandate_by_code.get(pf["mandate_code"], [])
        if not bands:
            continue
        cap = float(bands[0]["max_single_position_pct"])
        cur_holdings = [
            h for h in holdings
            if h["portfolio_id"] == pf["portfolio_id"] and h.get("snapshot_date") == current_snapshot
        ]
        for h in cur_holdings:
            wt = float(h.get("weight_pct") or 0)
            if wt > cap:
                overshoot = wt - cap
                # severity: how far over cap, relative to cap itself.
                # a position at 2x the cap is much more severe than one at 1.05x.
                severity = min(1.0, overshoot / cap)
                signals[cid]["flags"].append({
                    "type": "single_position_breach",
                    "severity": round(severity, 2),
                    "detail": (
                        f"{h.get('instrument_id')} at {wt:.1f}% vs {cap:.0f}% cap "
                        f"in {pf['portfolio_name']}"
                    ),
                })

    # --- credit facility LTV approaching margin call ---
    for cfl in credit:
        cid = cfl["client_id"]
        ltv = cfl.get(f"ltv_pct_{current_snapshot}")
        margin = cfl.get("margin_call_ltv_pct")
        if ltv and margin:
            ltv_f, margin_f = float(ltv), float(margin)
            gap = margin_f - ltv_f
            if gap < 10:
                severity = round(min(1.0, (10 - gap) / 10), 2)
                signals[cid]["flags"].append({
                    "type": "ltv_margin_call_risk",
                    "severity": max(severity, 0.5),  # this category is inherently urgent
                    "detail": (
                        f"LTV {ltv_f:.1f}% vs margin call trigger {margin_f:.1f}% "
                        f"(facility {cfl['facility_id']}, gap {gap:.1f}pp)"
                    ),
                })

    # --- liquidity gap: uncalled private-market commitments vs cash on hand ---
    cash_by_client: dict[str, float] = {}
    for h in holdings:
        if h.get("snapshot_date") == current_snapshot and h.get("asset_class") == "Cash and Equivalents":
            cid = pf_client.get(h["portfolio_id"])
            if cid:
                cash_by_client[cid] = cash_by_client.get(cid, 0) + float(h.get("market_value_usd") or 0)

    uncalled_by_client: dict[str, float] = {}
    for cm in commitments:
        cid = cm["client_id"]
        uncalled_by_client[cid] = uncalled_by_client.get(cid, 0) + float(cm["uncalled"])

    for cid, uncalled in uncalled_by_client.items():
        cash = cash_by_client.get(cid, 0)
        if uncalled > cash:
            gap = uncalled - cash
            severity = round(min(1.0, gap / max(uncalled, 1)), 2)
            signals[cid]["flags"].append({
                "type": "liquidity_gap",
                "severity": max(severity, 0.4),
                "detail": f"cash on hand ${cash:,.0f} vs uncalled commitments ${uncalled:,.0f} (shortfall ${gap:,.0f})",
            })

    # --- RM notes: fund gating and explicit "concern" language ---
    for n in notes:
        if not isinstance(n, dict):
            continue
        cid = n.get("client_id")
        if cid not in signals:
            continue
        txt = n.get("note", "").lower()
        if "gate" in txt or "gated" in txt:
            signals[cid]["flags"].append({
                "type": "fund_gating",
                "severity": 0.7,
                "detail": f"RM note ({n.get('note_date')}): \"{n.get('note')[:140]}\"",
            })

    # add a precomputed dollar-exposure anchor per client, so the ranking model has an
    # explicit magnitude figure rather than having to eyeball severity % against AUM:
    # severity-weighted exposure = AUM * (highest single flag severity). This is a rough
    # proxy for "how much of this relationship is riding on the worst thing we've found,"
    # not a precise dollar-at-risk figure — the model should treat it as a magnitude hint
    # alongside the actual dollar figures already present in flag details (e.g. liquidity
    # shortfalls are already stated in USD there).
    for v in signals.values():
        if v["flags"]:
            max_severity = max(f["severity"] for f in v["flags"])
            v["max_flag_severity"] = round(max_severity, 2)
            v["severity_weighted_exposure_usd"] = round(v["aum_usd"] * max_severity, 0)

    return {cid: v for cid, v in signals.items() if v["flags"]}


if __name__ == "__main__":
    data_dir = Path(sys.argv[1]) / "data" if len(sys.argv) > 1 else Path("data")
    out = build_signals(data_dir)
    out_path = Path(__file__).resolve().parents[2] / "sample_signals.json"
    out_path.write_text(json.dumps(out, indent=2))
    print(f"wrote {len(out)} client signal bundles to {out_path}")
