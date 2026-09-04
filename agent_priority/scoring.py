"""
Deterministic client-prioritisation engine.

Ported from the standalone compute_priorities.py script into an importable
module so the FastAPI backend can compute (and re-weight) the book on
request instead of writing a static file. Every score is derived directly
from the dataset — no LLM involved here; the LLM only sits in front of this
output in main.py's /ask endpoint.
"""
import json
import os

import numpy as np
import pandas as pd

TODAY = pd.Timestamp("2026-08-26")

QUALITATIVE_FLAGS = {
    "CL-0002": [
        {"tag": "Collateral risk", "severity": 85,
         "text": "Drew a further USD 1.7m against the Lombard line into the June tech drawdown, "
                 "raising utilisation at exactly the moment collateral was most volatile. RM flagged it; "
                 "client proceeded anyway. Facility breached its 75% margin-call trigger at 30 Jun 2026 "
                 "(75.64%) and was only cured by the subsequent price recovery, not by any action taken.",
         "source": "rm_notes N-004; credit_facilities CF-0001"},
    ],
    "CL-0003": [
        {"tag": "Suitability mismatch", "severity": 95,
         "text": "Newly inherited client, risk-profiled Conservative, explicitly asked for "
                 "'something safe and boring' and says she does not understand the portfolio her "
                 "late husband built. The inherited portfolio itself is not Conservative. This is an "
                 "active, named mismatch between stated risk profile and actual holdings.",
         "source": "rm_notes N-005, N-006"},
        {"tag": "Confirmed near-term liability", "severity": 60,
         "text": "EUR 3.4m German inheritance tax instalment is due before year end, already grieving "
                 "and in transition.", "source": "planned_cash_needs CN-004"},
    ],
    "CL-0004": [
        {"tag": "Unanswered client question", "severity": 55,
         "text": "Forwarded an article about interest rates and asked whether he should move everything "
                 "to deposits. The RM has not yet replied 8 days later. Client is also fixated on 'the "
                 "numbers are red' on his bond book despite an unchanged income plan.",
         "source": "rm_notes N-028, N-007"},
    ],
    "CL-0006": [
        {"tag": "Liquidity surprise", "severity": 45,
         "text": "Redeemed from a private credit fund to fund US tuition and capital calls and was "
                 "surprised to find it gated; most assets are SGD while obligations are USD, a currency "
                 "mismatch that has become more expensive this year.",
         "source": "rm_notes N-009"},
    ],
    "CL-0007": [
        {"tag": "Client-directed breach (waived)", "severity": 30,
         "text": "Instructed a gold purchase that took the commodities sleeve above the mandate ceiling. "
                 "Client acknowledged and confirmed in writing; suitability waiver is on file.",
         "source": "rm_notes N-010"},
        {"tag": "Unresolved tax question blocking a stated goal", "severity": 50,
         "text": "Wants to fund a USD 12m foundation from appreciated assets in 2027; long-held UK tax "
                 "questions remain unresolved and wealth planning has not yet been looped in.",
         "source": "rm_notes N-011"},
    ],
    "CL-0009": [
        {"tag": "Advice not executed", "severity": 65,
         "text": "Agreed a post-sale deployment plan in principle in Oct 2024 and again in Jun 2025, but "
                 "still has not executed — third attempt now. Also refuses to sell a residual single-stock "
                 "stake for sentimental reasons.",
         "source": "rm_notes N-013"},
    ],
    "CL-0011": [
        {"tag": "Succession risk, no structure in place", "severity": 90,
         "text": "78 years old, in declining health, four children (two involved in the business, two "
                 "not), no trust or holding structure exists. Estate is overwhelmingly illiquid Singapore "
                 "property. Fourth attempt at this conversation; client asked for more time.",
         "source": "rm_notes N-015"},
    ],
    "CL-0012": [
        {"tag": "Cannot outlive the plan", "severity": 80,
         "text": "71 years old, retired, drawing income from a bond portfolio that is down on rising "
                 "yields. Refuses to sell at a loss and wants to 'wait for the bonds to come back' — but "
                 "the longest bond does not mature until 2045.",
         "source": "rm_notes N-016"},
    ],
    "CL-0013": [
        {"tag": "Concentration client dismisses", "severity": 55,
         "text": "Sees the technology drawdown as a buying opportunity and wants more single-name "
                 "exposure, dismissive of concentration once the equity-linked note on the same name is "
                 "counted alongside the stock.",
         "source": "rm_notes N-017"},
    ],
    "CL-0014": [
        {"tag": "Hidden look-through concentration", "severity": 85,
         "text": "Golden Harbour Properties exposure is not one position but four: the shares directly, "
                 "a subordinated perpetual bond from the same issuer, an accumulator structured product "
                 "referencing the same stock, and the client's own Mid-Levels development business.",
         "source": "rm_notes N-018"},
        {"tag": "Funding gap on a confirmed liability", "severity": 70,
         "text": "HKD 60m equity contribution due by mid-2027 for the redevelopment project; when shown "
                 "what is actually sellable, the client was surprised how little of the portfolio is "
                 "liquid.", "source": "rm_notes N-019; planned_cash_needs CN-013"},
    ],
    "CL-0015": [
        {"tag": "Event-driven leverage, understood risk", "severity": 25,
         "text": "Asked for the most aggressive way to express a Middle East escalation view and "
                 "subscribed a worst-of FCN same day; understands the payoff and asked good questions.",
         "source": "rm_notes N-020"},
    ],
    "CL-0016": [
        {"tag": "Currency mismatch at retirement + dealing restriction", "severity": 40,
         "text": "Needs JPY income from 2030 but holds mostly non-JPY assets; emotionally attached to "
                 "employer shares held since 2013; board dealing restrictions mean the next open window "
                 "is not until November 2026.",
         "source": "rm_notes N-021"},
    ],
    "CL-0017": [
        {"tag": "Family office liquidity map requested", "severity": 60,
         "text": "Family-office CFO has asked for a full liquidity map before the October investment "
                 "committee; the private credit position has now gated three consecutive quarters and "
                 "sits alongside USD 15.8m of uncalled commitments.",
         "source": "rm_notes N-022, N-023"},
    ],
    "CL-0018": [
        {"tag": "Let a hedge run past its purpose", "severity": 50,
         "text": "Sized gold as a 5% hedge; it is now materially larger and has not been trimmed. "
                 "Separately, her luxury-distribution business and her largest equity holding are the "
                 "same Greater-China consumer theme, both under pressure together.",
         "source": "rm_notes N-024"},
    ],
    "CL-0019": [
        {"tag": "Portfolio not delivering its stated purpose", "severity": 45,
         "text": "The Asia portfolio was meant to be uncorrelated with his Gulf shipping business; the "
                 "shipping/energy FCN he subscribed makes it the same bet instead.",
         "source": "rm_notes N-025, N-026"},
    ],
    "CL-0020": [
        {"tag": "Sector concentration acknowledged, not sized", "severity": 30,
         "text": "Aware that her wealth, her largest holdings and her healthcare-clinics business are "
                 "the same sector bet, expanding into Malaysia. No action agreed yet.",
         "source": "rm_notes N-027"},
    ],
}

TAG_ACTIONS = {
    "Suitability mismatch": "Name the mismatch directly: her risk profile says Conservative, the inherited portfolio doesn't. Propose a de-risking plan.",
    "Succession risk, no structure in place": "Fifth conversation, not the first — bring wealth planning into the room with a structure to sign.",
    "Hidden look-through concentration": "Show the four-way exposure on one page and decide which leg comes off first.",
    "Collateral risk": "Revisit the facility now, while it's cured — agree what happens next time collateral drops this fast.",
    "Cannot outlive the plan": "Reframe away from 'wait for recovery' toward the maturity schedule versus the drawdown horizon.",
    "Advice not executed": "Bring the cash-drag number, not the allocation slide.",
    "Family office liquidity map requested": "Deliver the liquidity map ahead of the October investment committee.",
    "Confirmed near-term liability": "Confirm the funding source before it becomes a forced sale.",
    "Unanswered client question": "Close the loop with a call, not another email.",
    "Liquidity surprise": "Walk through which holdings are actually daily-liquid.",
    "Client-directed breach (waived)": "Waiver's on file — periodic revisit only.",
    "Unresolved tax question blocking a stated goal": "Loop in wealth planning before the funding decision is due.",
    "Concentration client dismisses": "Quantify the combined single-name exposure including the linked note.",
    "Funding gap on a confirmed liability": "Walk through the sellable list again ahead of the contribution date.",
    "Event-driven leverage, understood risk": "No action needed — keep on the standard review cycle.",
    "Currency mismatch at retirement + dealing restriction": "Start building the income sleeve now, ahead of the dealing window.",
    "Let a hedge run past its purpose": "Ask directly whether it's still a hedge or has become a view.",
    "Portfolio not delivering its stated purpose": "Revisit what the position was actually meant to achieve.",
    "Sector concentration acknowledged, not sized": "Put a number on the combined exposure before it grows further.",
}


def _to_usd(amount, ccy, fx_cur):
    if ccy == "USD":
        return amount
    inv_pairs = {"SGD": "USDSGD", "HKD": "USDHKD", "JPY": "USDJPY", "CHF": "USDCHF",
                 "IDR": "USDIDR", "THB": "USDTHB", "INR": "USDINR"}
    mult_pairs = {"EUR": "EURUSD", "GBP": "GBPUSD"}
    if ccy in inv_pairs:
        return amount / fx_cur[inv_pairs[ccy]]
    if ccy in mult_pairs:
        return amount * fx_cur[mult_pairs[ccy]]
    return amount


def _pct_rank(s):
    return s.rank(pct=True) * 100


def build_book(data_dir: str, cv_weight: float = 0.4, an_weight: float = 0.6) -> dict:
    """Compute the full, ranked client book. Weights need not sum to 1 (normalised)."""
    total_w = cv_weight + an_weight
    if total_w <= 0:
        cv_weight, an_weight = 0.4, 0.6
    else:
        cv_weight, an_weight = cv_weight / total_w, an_weight / total_w

    def load(name):
        return pd.read_csv(os.path.join(data_dir, name))

    clients = load("clients.csv")
    portfolios = load("portfolios.csv")
    holdings = load("holdings.csv")
    instruments = load("instruments.csv")
    mandates = load("mandates.csv")
    facilities = load("credit_facilities.csv")
    commitments = load("commitments.csv")
    cash_needs = load("planned_cash_needs.csv")
    market = load("market_context.csv")

    with open(os.path.join(data_dir, "rm_notes.json"), encoding="utf-8") as f:
        notes = json.load(f)

    DATES = sorted(holdings["snapshot_date"].unique())
    LATEST = DATES[-1]
    fx_cur = market[market.snapshot_date == LATEST].set_index("series_id")["value"]

    # ---------------- Client Value ----------------
    cv = clients[["client_id", "client_name", "total_aum_usd", "wealth_band",
                  "life_stage", "client_since"]].copy()
    cv["client_since"] = pd.to_datetime(cv["client_since"])
    cv["tenure_years"] = (TODAY - cv["client_since"]).dt.days / 365.25

    port_latest_aum = portfolios[["client_id", "service_model", "aum_usd_current"]].copy()
    managed = (port_latest_aum.assign(
                    managed=np.where(port_latest_aum.service_model.isin(["Discretionary", "Advisory"]),
                                      port_latest_aum.aum_usd_current, 0.0))
               .groupby("client_id")
               .agg(managed_aum=("managed", "sum"), total_port_aum=("aum_usd_current", "sum")))
    managed["managed_share_pct"] = 100 * managed.managed_aum / managed.total_port_aum
    cv = cv.merge(managed[["managed_share_pct"]], on="client_id", how="left")

    GROWTH_STAGES = {
        "Pre-liquidity event": 100, "Post-liquidity event": 85,
        "Succession and estate planning": 55, "Multi-generational - G2 and G3": 60,
        "Recently inherited - transition": 70, "Peak earning years": 40,
    }
    def growth_score(stage):
        for k, v in GROWTH_STAGES.items():
            if k.lower() in str(stage).lower():
                return v
        return 15
    cv["growth_score"] = cv.life_stage.apply(growth_score)
    cv["aum_pctile"] = _pct_rank(cv.total_aum_usd)
    cv["tenure_pctile"] = _pct_rank(cv.tenure_years)
    cv["client_value_score"] = (
        0.50 * cv.aum_pctile + 0.25 * cv.managed_share_pct.clip(0, 100) +
        0.15 * cv.growth_score + 0.10 * cv.tenure_pctile
    ).round(1)

    # ---------------- Attention Need ----------------
    an = clients[["client_id", "client_name", "kyc_review_due", "risk_profile",
                  "risk_tolerance_score", "liquidity_needs"]].copy()
    an["kyc_review_due"] = pd.to_datetime(an["kyc_review_due"])
    an["kyc_days"] = (an["kyc_review_due"] - TODAY).dt.days

    fac_cur_cols = [c for c in facilities.columns if c.startswith("ltv_pct_")]
    latest_ltv_col = sorted(fac_cur_cols)[-1]
    facilities["headroom_to_trigger_now"] = facilities["margin_call_ltv_pct"] - facilities[latest_ltv_col]
    facilities["peak_ltv_in_period"] = facilities[fac_cur_cols].max(axis=1)
    facilities["breached_in_period"] = facilities["peak_ltv_in_period"] >= facilities["margin_call_ltv_pct"]
    fac_by_client = facilities.groupby("client_id").agg(
        min_headroom_now=("headroom_to_trigger_now", "min"),
        any_breach_in_period=("breached_in_period", "any"),
        facility_count=("facility_id", "count"),
    )
    an = an.merge(fac_by_client, on="client_id", how="left")

    cash_needs["due_from"] = pd.to_datetime(cash_needs["due_from"])
    near_term = cash_needs[(cash_needs.due_from <= TODAY + pd.Timedelta(days=365)) &
                            (cash_needs.certainty.isin(["Confirmed", "Likely"]))].copy()
    near_term["amount_usd"] = near_term.apply(lambda r: _to_usd(r.amount, r.currency, fx_cur), axis=1)
    need_by_client = near_term.groupby("client_id")["amount_usd"].sum().rename("near_term_need_usd")

    liquid_now = holdings[(holdings.snapshot_date == LATEST) & (holdings.liquidity_tier == "Daily")]
    liquid_by_client = liquid_now.groupby("client_id")["market_value_usd"].sum().rename("liquid_aum_usd")
    uncalled_by_client = commitments.groupby("client_id")["uncalled"].sum().rename("uncalled_commitment_usd")

    an = an.merge(need_by_client, on="client_id", how="left") \
           .merge(liquid_by_client, on="client_id", how="left") \
           .merge(uncalled_by_client, on="client_id", how="left")
    an[["near_term_need_usd", "liquid_aum_usd", "uncalled_commitment_usd"]] = \
        an[["near_term_need_usd", "liquid_aum_usd", "uncalled_commitment_usd"]].fillna(0.0)
    an["liquidity_claim_usd"] = an.near_term_need_usd + an.uncalled_commitment_usd
    an["liquidity_coverage_ratio"] = np.where(
        an.liquid_aum_usd > 0, an.liquidity_claim_usd / an.liquid_aum_usd,
        np.where(an.liquidity_claim_usd > 0, 5, 0))

    notes_df = pd.DataFrame(notes)
    notes_df["note_date"] = pd.to_datetime(notes_df["note_date"])
    last_contact = notes_df.groupby("client_id")["note_date"].max().rename("last_contact")
    an = an.merge(last_contact, on="client_id", how="left")
    an["days_since_contact"] = (TODAY - an["last_contact"]).dt.days
    an["days_since_contact"] = an["days_since_contact"].fillna(365)

    mandate_bands = mandates.set_index(["mandate_code", "asset_class"])
    managed_ports = portfolios[portfolios.service_model.isin(["Discretionary", "Advisory"])]
    h_latest = holdings[holdings.snapshot_date == LATEST]
    breach_rows = []
    for _, p in managed_ports.iterrows():
        ph = h_latest[h_latest.portfolio_id == p.portfolio_id]
        if ph.empty:
            continue
        by_ac = ph.groupby("asset_class")["weight_pct"].sum()
        for ac in mandates[mandates.mandate_code == p.mandate_code]["asset_class"].unique():
            w = by_ac.get(ac, 0.0)
            band = mandate_bands.loc[(p.mandate_code, ac)]
            if w < band.min_pct or w > band.max_pct:
                breach_rows.append({
                    "client_id": p.client_id, "portfolio_id": p.portfolio_id,
                    "portfolio_name": p.portfolio_name, "asset_class": ac,
                    "weight_pct": round(w, 1), "min_pct": band.min_pct, "max_pct": band.max_pct,
                    "mandate_name": p.mandate_name,
                })
        conc = ph.merge(instruments[["instrument_id", "concentration_limit_applies"]], on="instrument_id", how="left")
        conc = conc[conc.concentration_limit_applies == "Y"]
        band_any = mandates[mandates.mandate_code == p.mandate_code].iloc[0]
        max_single = band_any.max_single_position_pct
        over = conc[conc.weight_pct > max_single]
        for _, r in over.iterrows():
            breach_rows.append({
                "client_id": p.client_id, "portfolio_id": p.portfolio_id,
                "portfolio_name": p.portfolio_name, "asset_class": f"Single position: {r.instrument_name}",
                "weight_pct": round(r.weight_pct, 1), "min_pct": 0, "max_pct": max_single,
                "mandate_name": p.mandate_name,
            })
    breach_df = pd.DataFrame(breach_rows)
    breach_count = (breach_df.groupby("client_id").size().rename("mandate_breach_count")
                    if not breach_df.empty else pd.Series(dtype=float, name="mandate_breach_count"))
    an = an.merge(breach_count, on="client_id", how="left")
    an["mandate_breach_count"] = an["mandate_breach_count"].fillna(0)

    an["qual_flags"] = an.client_id.map(lambda cid: QUALITATIVE_FLAGS.get(cid, []))
    an["qual_severity_max"] = an.qual_flags.apply(lambda fl: max([f["severity"] for f in fl], default=0))

    an["collateral_score"] = an.min_headroom_now.apply(
        lambda h: 0 if pd.isna(h) else float(np.clip(100 - h * 4, 0, 100)))
    an.loc[an.any_breach_in_period == True, "collateral_score"] = np.maximum(
        an.loc[an.any_breach_in_period == True, "collateral_score"], 90)
    an["liquidity_score"] = an.liquidity_coverage_ratio.apply(lambda r: float(np.clip(r * 60, 0, 100)))
    an["kyc_score"] = an.kyc_days.apply(lambda d: 100 if d < 0 else float(np.clip(100 - d / 1.2, 0, 100)))
    an["contact_score"] = an.days_since_contact.apply(lambda d: float(np.clip((d - 30) * 1.2, 0, 100)))
    an["mandate_score"] = an.mandate_breach_count.apply(lambda n: float(np.clip(n * 35, 0, 100)))
    an["qualitative_score"] = an.qual_severity_max.astype(float)
    an["attention_need_score"] = (
        0.20 * an.collateral_score + 0.15 * an.liquidity_score + 0.10 * an.kyc_score +
        0.10 * an.contact_score + 0.10 * an.mandate_score + 0.35 * an.qualitative_score
    ).round(1)

    merged = cv.merge(an, on=["client_id", "client_name"], how="inner")
    merged["overall_priority"] = (
        cv_weight * merged.client_value_score + an_weight * merged.attention_need_score
    ).round(1)
    merged = merged.sort_values("overall_priority", ascending=False).reset_index(drop=True)
    merged["rank"] = merged.index + 1

    def recommended_action(flags, ev):
        out = []
        flags_sorted = sorted(flags, key=lambda f: -f["severity"])
        if flags_sorted:
            out.append(TAG_ACTIONS.get(flags_sorted[0]["tag"], f"Discuss and document: {flags_sorted[0]['tag']}."))
        if ev["min_headroom_to_margin_call_pct"] is not None and ev["min_headroom_to_margin_call_pct"] < 15:
            out.append(f"Facility headroom is {ev['min_headroom_to_margin_call_pct']:.1f} points from its "
                       f"margin-call trigger — review before the next volatility spike.")
        if ev["mandate_breach_count"] > 0:
            out.append(f"Rebalance or obtain a documented waiver for {ev['mandate_breach_count']} mandate breach(es).")
        if ev["kyc_days_until_due"] <= 30:
            out.append(f"KYC review due {ev['kyc_review_due']} ({ev['kyc_days_until_due']}d) — schedule before the deadline.")
        if not out:
            out.append("No open flags. Keep on the standard review cycle.")
        return out[:4]

    def row_to_dict(r):
        ev = {
            "min_headroom_to_margin_call_pct": None if pd.isna(r.min_headroom_now) else round(r.min_headroom_now, 1),
            "facility_breached_in_period": bool(r.any_breach_in_period) if pd.notna(r.any_breach_in_period) else False,
            "near_term_liquidity_claim_usd": round(r.liquidity_claim_usd, 0),
            "liquid_daily_aum_usd": round(r.liquid_aum_usd, 0),
            "kyc_review_due": r.kyc_review_due.strftime("%Y-%m-%d"),
            "kyc_days_until_due": int(r.kyc_days),
            "days_since_last_contact": int(r.days_since_contact),
            "mandate_breach_count": int(r.mandate_breach_count),
        }
        return {
            "rank": int(r["rank"]),
            "client_id": r.client_id,
            "client_name": r.client_name,
            "wealth_band": r.wealth_band,
            "life_stage": r.life_stage,
            "total_aum_usd": round(r.total_aum_usd, 0),
            "overall_priority": r.overall_priority,
            "client_value_score": r.client_value_score,
            "attention_need_score": r.attention_need_score,
            "client_value_breakdown": {
                "aum_percentile": round(r.aum_pctile, 1),
                "managed_share_pct": round(r.managed_share_pct, 1) if pd.notna(r.managed_share_pct) else None,
                "growth_potential": r.growth_score,
                "tenure_years": round(r.tenure_years, 1),
            },
            "attention_need_breakdown": {
                "collateral_score": round(r.collateral_score, 1),
                "liquidity_score": round(r.liquidity_score, 1),
                "kyc_score": round(r.kyc_score, 1),
                "contact_score": round(r.contact_score, 1),
                "mandate_score": round(r.mandate_score, 1),
                "qualitative_score": round(r.qualitative_score, 1),
            },
            "evidence": ev,
            "mandate_breaches": (breach_df[breach_df.client_id == r.client_id].to_dict("records")
                                  if not breach_df.empty else []),
            "qualitative_flags": r.qual_flags,
            "recommended_actions": recommended_action(r.qual_flags, ev),
        }

    client_records = [row_to_dict(r) for _, r in merged.iterrows()]
    return {
        "generated_for": "Priscilla Ong, RM-SG-014, Asia desk (Singapore & Hong Kong)",
        "as_of": LATEST,
        "weights": {"client_value": round(cv_weight, 3), "attention_need": round(an_weight, 3)},
        "clients": client_records,
    }


def compute_alerts(book: dict) -> list:
    """Deterministic proactive alerts — same rules as the dashboard, no LLM."""
    out = []
    for c in book["clients"]:
        ev = c["evidence"]
        if ev["min_headroom_to_margin_call_pct"] is not None and ev["min_headroom_to_margin_call_pct"] < 5:
            out.append({"key": f"{c['client_id']}:margin", "severity": 96, "title": "Margin-call risk",
                        "client_id": c["client_id"], "client_name": c["client_name"],
                        "detail": f"{ev['min_headroom_to_margin_call_pct']:.1f}pt headroom left" +
                                  (" — breached its trigger earlier this period" if ev["facility_breached_in_period"] else "")})
        if ev["kyc_days_until_due"] < 0:
            out.append({"key": f"{c['client_id']}:kyc", "severity": 80, "title": "KYC review overdue",
                        "client_id": c["client_id"], "client_name": c["client_name"],
                        "detail": f"due {ev['kyc_review_due']}, {abs(ev['kyc_days_until_due'])} days overdue"})
        for f in c["qualitative_flags"]:
            if f["severity"] >= 85:
                out.append({"key": f"{c['client_id']}:{f['tag']}", "severity": f["severity"], "title": f["tag"],
                            "client_id": c["client_id"], "client_name": c["client_name"], "detail": f["source"]})
        if ev["mandate_breach_count"] >= 3:
            out.append({"key": f"{c['client_id']}:mandate", "severity": 58, "title": "Multiple mandate breaches open",
                        "client_id": c["client_id"], "client_name": c["client_name"],
                        "detail": f"{ev['mandate_breach_count']} breaches across the book"})
    out.sort(key=lambda a: -a["severity"])
    return out
