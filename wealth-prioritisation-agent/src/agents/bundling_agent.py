"""
Bundling Agent: Recommends tailored product bundles for each client based on
their portfolio context, risk profile, life stage, and risk signals.

Design:
- Uses pre-computed signals (from signals.py) and portfolio context (from pipeline outputs)
- Matches clients to pre-defined product bundles using deterministic rule-based logic
- Falls back to LLM reasoning when available (requires GEMINI_API_KEY)
- Outputs each client with their recommended bundle and rationale
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

sys.path.append(str(Path(__file__).resolve().parents[1]))

# Optional LLM import
try:
    from llm_client import generate_json  # noqa: E402
    LLM_AVAILABLE = True
except Exception:
    LLM_AVAILABLE = False

# Product Bundle Definitions
PRODUCT_BUNDLES = {
    "WEALTH_PRESERVATION": {
        "name": "Wealth Preservation & Legacy Bundle",
        "description": "Capital protection with income generation and estate planning integration",
        "target_profiles": ["Conservative", "Income"],
        "target_life_stages": ["Pre-retirement", "Retired", "Retired - legacy and philanthropy", "Succession and estate planning"],
        "components": [
            {"product": "Short Duration Bond Fund", "code": "SYN-FI-0208", "allocation_pct": 25, "rationale": "Capital preservation with low duration risk"},
            {"product": "Inflation-Linked Bonds", "code": "SYN-FI-0212", "allocation_pct": 15, "rationale": "Real yield protection against inflation"},
            {"product": "Global Dividend Equity Fund", "code": "SYN-EQ-0025", "allocation_pct": 20, "rationale": "Quality income with downside resilience"},
            {"product": "Gold Bullion ETF", "code": "SYN-CM-0402", "allocation_pct": 10, "rationale": "Crisis hedge and portfolio diversifier"},
            {"product": "Structured Capital Protection Notes", "code": "SYN-SP-0510", "allocation_pct": 20, "rationale": "Principal protection with upside participation"},
            {"product": "Estate Planning Wrapper", "code": "SYN-SV-0601", "allocation_pct": 10, "rationale": "Tax-efficient wealth transfer and legacy structuring"},
        ],
        "min_aum_usd": 5_000_000,
        "risk_budget": "Low",
    },
    "BALANCED_GROWTH": {
        "name": "Balanced Growth & Diversification Bundle",
        "description": "Core-satellite approach with risk-controlled growth and dynamic hedging",
        "target_profiles": ["Balanced", "Balanced Growth", "Sustainable Balanced"],
        "target_life_stages": ["Wealth accumulation", "Wealth accumulation - second generation", "Peak earning years", "Post-liquidity event"],
        "components": [
            {"product": "Global Developed Equity Index Fund", "code": "SYN-EQ-0001", "allocation_pct": 30, "rationale": "Broad market beta at low cost"},
            {"product": "Asia ex-Japan Equity Fund", "code": "SYN-EQ-0020", "allocation_pct": 15, "rationale": "Regional growth exposure"},
            {"product": "US Technology Leaders Fund", "code": "SYN-EQ-0003", "allocation_pct": 10, "rationale": "Quality growth with strong cash flows"},
            {"product": "Asia Investment Grade Credit Fund", "code": "SYN-FI-0204", "allocation_pct": 20, "rationale": "Stable income with credit quality"},
            {"product": "Short Duration USD Bond Fund", "code": "SYN-FI-0208", "allocation_pct": 10, "rationale": "Liquidity buffer and rate hedge"},
            {"product": "Global Macro Fund", "code": "SYN-AL-0303", "allocation_pct": 10, "rationale": "Dynamic hedge across regimes"},
            {"product": "ESG Screened Overlay", "code": "SYN-EQ-0026", "allocation_pct": 5, "rationale": "Sustainability alignment for balanced mandates"},
        ],
        "min_aum_usd": 3_000_000,
        "risk_budget": "Medium",
    },
    "GROWTH_ACCELERATION": {
        "name": "Growth Acceleration & Alpha Bundle",
        "description": "High-conviction growth with private market access and tactical overlays",
        "target_profiles": ["Growth"],
        "target_life_stages": ["Pre-liquidity event", "Wealth accumulation", "Early career - next generation"],
        "components": [
            {"product": "US Technology Leaders Fund", "code": "SYN-EQ-0003", "allocation_pct": 25, "rationale": "Concentrated innovation exposure"},
            {"product": "Emerging Markets Equity Fund", "code": "SYN-EQ-0027", "allocation_pct": 15, "rationale": "Long-term demographic growth"},
            {"product": "Private Equity Co-Investment", "code": "SYN-AL-0301", "allocation_pct": 20, "rationale": "Access to top-quartile private market returns"},
            {"product": "Venture Capital Fund", "code": "SYN-AL-0308", "allocation_pct": 15, "rationale": "Early-stage innovation capture"},
            {"product": "Asia High Yield Credit Fund", "code": "SYN-FI-0211", "allocation_pct": 15, "rationale": "Enhanced income with growth correlation"},
            {"product": "Tactical Options Overlay", "code": "SYN-SP-0511", "allocation_pct": 10, "rationale": "Downside protection and income enhancement"},
        ],
        "min_aum_usd": 10_000_000,
        "risk_budget": "High",
    },
    "CONCENTRATION_SOLUTION": {
        "name": "Concentration Risk Diversification Bundle",
        "description": "Systematic de-risking of concentrated positions with tax-efficient transition",
        "target_profiles": ["All"],
        "target_life_stages": ["All"],
        "trigger_flags": ["single_position_breach", "ltv_margin_call_risk"],
        "components": [
            {"product": "Exchange Fund / Swap Structure", "code": "SYN-SP-0512", "allocation_pct": 40, "rationale": "Tax-deferred diversification of concentrated stock"},
            {"product": "Collar / Put Spread Structure", "code": "SYN-SP-0513", "allocation_pct": 20, "rationale": "Downside protection while retaining upside"},
            {"product": "Global Developed Equity Index Fund", "code": "SYN-EQ-0001", "allocation_pct": 25, "rationale": "Broad market replacement exposure"},
            {"product": "Short Duration USD Bond Fund", "code": "SYN-FI-0208", "allocation_pct": 15, "rationale": "Liquidity for staged diversification"},
        ],
        "min_aum_usd": 1_000_000,
        "risk_budget": "Variable",
    },
    "LIQUIDITY_BRIDGE": {
        "name": "Liquidity Bridge & Capital Call Bundle",
        "description": "Structured liquidity for capital calls, tuition, and near-term obligations",
        "target_profiles": ["All"],
        "target_life_stages": ["All"],
        "trigger_flags": ["liquidity_gap", "fund_gating"],
        "components": [
            {"product": "Ultra-Short Treasury Fund", "code": "SYN-FI-0215", "allocation_pct": 40, "rationale": "Immediate liquidity with minimal rate risk"},
            {"product": "Committed Credit Facility", "code": "SYN-SV-0602", "allocation_pct": 30, "rationale": "Standby liquidity for capital calls"},
            {"product": "Money Market Fund", "code": "SYN-FI-0216", "allocation_pct": 20, "rationale": "Daily liquidity for operational needs"},
            {"product": "Structured Deposit", "code": "SYN-SP-0514", "allocation_pct": 10, "rationale": "Enhanced yield on core liquidity reserve"},
        ],
        "min_aum_usd": 500_000,
        "risk_budget": "Very Low",
    },
    "SUSTAINABLE_IMPACT": {
        "name": "Sustainable Impact & Transition Bundle",
        "description": "ESG-integrated portfolio with climate transition and impact themes",
        "target_profiles": ["Sustainable Balanced"],
        "target_life_stages": ["Peak earning years", "Early career - next generation", "Wealth accumulation"],
        "components": [
            {"product": "Global Sustainable Equity Fund", "code": "SYN-EQ-0028", "allocation_pct": 35, "rationale": "ESG leaders with quality bias"},
            {"product": "Green Bond Fund", "code": "SYN-FI-0217", "allocation_pct": 20, "rationale": "Climate-aligned fixed income"},
            {"product": "Climate Transition Fund", "code": "SYN-AL-0309", "allocation_pct": 15, "rationale": "Private markets decarbonization exposure"},
            {"product": "Impact Private Credit", "code": "SYN-FI-0218", "allocation_pct": 15, "rationale": "Measurable social/environmental impact with yield"},
            {"product": "Sustainable Infrastructure", "code": "SYN-AL-0310", "allocation_pct": 15, "rationale": "Real assets with ESG cash flows"},
        ],
        "min_aum_usd": 5_000_000,
        "risk_budget": "Medium",
    },
    "FAMILY_OFFICE_MULTI_GEN": {
        "name": "Multi-Generational Family Office Bundle",
        "description": "Segmented sleeves for G1 preservation, G2 growth, G3 venture with governance overlay",
        "target_profiles": ["Balanced"],
        "target_life_stages": ["Multi-generational - G2 and G3", "Succession and estate planning"],
        "components": [
            {"product": "G1 - Preservation Sleeve", "code": "SYN-SV-0603", "allocation_pct": 40, "rationale": "Capital protection, income, legacy for senior generation"},
            {"product": "G2 - Growth Sleeve", "code": "SYN-SV-0604", "allocation_pct": 35, "rationale": "Diversified growth aligned with family values"},
            {"product": "G3 - Venture/Innovation Sleeve", "code": "SYN-SV-0605", "allocation_pct": 15, "rationale": "Long-horizon innovation for next generation"},
            {"product": "Family Governance Advisory", "code": "SYN-SV-0606", "allocation_pct": 10, "rationale": "Governance framework, education, conflict resolution"},
        ],
        "min_aum_usd": 50_000_000,
        "risk_budget": "Multi-tiered",
    },
    "POST_LIQUIDITY_DEPLOYMENT": {
        "name": "Post-Liquidity Event Deployment Bundle",
        "description": "Phased deployment of concentrated proceeds into diversified, tax-efficient allocation",
        "target_profiles": ["Balanced", "Growth", "Balanced Growth"],
        "target_life_stages": ["Post-liquidity event", "Pre-liquidity event"],
        "trigger_flags": ["single_position_breach"],
        "components": [
            {"product": "Staged Deployment Program", "code": "SYN-SV-0607", "allocation_pct": 50, "rationale": "Systematic 12-24 month dollar-cost averaging"},
            {"product": "Tax-Managed Equity Portfolio", "code": "SYN-EQ-0029", "allocation_pct": 25, "rationale": "Loss harvesting and tax-efficient rebalancing"},
            {"product": "Municipal Bond Ladder", "code": "SYN-FI-0219", "allocation_pct": 15, "rationale": "Tax-free income for post-sale cash needs"},
            {"product": "Alternatives Diversifier", "code": "SYN-AL-0311", "allocation_pct": 10, "rationale": "Uncorrelated returns for portfolio completion"},
        ],
        "min_aum_usd": 20_000_000,
        "risk_budget": "Medium (phased)",
    },
}


SYSTEM_INSTRUCTION = """You are a Private Banking Product Specialist who designs tailored product bundles for high-net-worth clients.

You are given:
1. A list of clients with their AUM, risk profile, life stage, and pre-computed risk/liquidity flags
2. Portfolio context (top holdings, sectors, regions, asset classes) from the news/scenario pipeline
3. A catalog of pre-defined product bundles with components, target profiles, and trigger conditions

Your job: For each client, recommend the MOST SUITABLE primary bundle and up to 2 complementary bundles, with clear rationale.

Rules:
- Match bundles to client's risk_profile, life_stage, and AUM (must meet min_aum_usd)
- Prioritize bundles triggered by the client's specific flags (e.g., concentration breach → CONCENTRATION_SOLUTION)
- A client can have a primary bundle + complementary bundles (e.g., BALANCED_GROWTH + CONCENTRATION_SOLUTION)
- Consider portfolio context: if client has 97% in one energy stock, CONCENTRATION_SOLUTION is mandatory
- Consider life stage: Pre-liquidity → POST_LIQUIDITY_DEPLOYMENT; Multi-gen → FAMILY_OFFICE_MULTI_GEN
- Consider AUM: Family office bundles only for >$50M; Growth acceleration only for >$10M
- Output must be structured JSON with bundle recommendations per client
- Do not invent products not in the catalog
- Be specific: reference actual flags, holdings, and numbers from the input
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "client_recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string"},
                    "name": {"type": "string"},
                    "aum_usd": {"type": "number"},
                    "risk_profile": {"type": "string"},
                    "life_stage": {"type": "string"},
                    "primary_bundle": {
                        "type": "object",
                        "properties": {
                            "bundle_key": {"type": "string"},
                            "bundle_name": {"type": "string"},
                            "fit_score": {"type": "number", "minimum": 0, "maximum": 100},
                            "rationale": {"type": "string"},
                            "triggered_by_flags": {"type": "array", "items": {"type": "string"}},
                            "key_components": {"type": "array", "items": {"type": "string"}},
                            "estimated_allocation_usd": {"type": "number"},
                        },
                        "required": ["bundle_key", "bundle_name", "fit_score", "rationale", "triggered_by_flags", "key_components", "estimated_allocation_usd"]
                    },
                    "complementary_bundles": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "bundle_key": {"type": "string"},
                                "bundle_name": {"type": "string"},
                                "fit_score": {"type": "number", "minimum": 0, "maximum": 100},
                                "rationale": {"type": "string"},
                                "triggered_by_flags": {"type": "array", "items": {"type": "string"}},
                                "key_components": {"type": "array", "items": {"type": "string"}},
                                "estimated_allocation_usd": {"type": "number"},
                            },
                            "required": ["bundle_key", "bundle_name", "fit_score", "rationale", "triggered_by_flags", "key_components", "estimated_allocation_usd"]
                        }
                    },
                    "portfolio_context_summary": {"type": "string"},
                    "implementation_notes": {"type": "string"},
                },
                "required": ["client_id", "name", "aum_usd", "risk_profile", "life_stage", "primary_bundle", "complementary_bundles", "portfolio_context_summary", "implementation_notes"]
            }
        }
    },
    "required": ["client_recommendations"]
}


def score_bundle_fit(client: Dict, bundle: Dict) -> tuple[int, List[str], List[str]]:
    """
    Score how well a bundle fits a client (0-100).
    Returns (score, triggered_flags, key_components).
    """
    score = 0
    triggered = []
    components = [c["product"] for c in bundle["components"]]
    
    # Base score for profile match
    if client["risk_profile"] in bundle["target_profiles"] or "All" in bundle["target_profiles"]:
        score += 30
    
    # Life stage match
    if client["life_stage"] in bundle["target_life_stages"] or "All" in bundle["target_life_stages"]:
        score += 25
    
    # AUM check
    if client["aum_usd"] >= bundle["min_aum_usd"]:
        score += 20
    else:
        return 0, [], []  # Hard filter: AUM too low
    
    # Flag triggers
    flag_types = {f["type"] for f in client.get("flags", [])}
    for trigger in bundle.get("trigger_flags", []):
        if trigger in flag_types:
            score += 15
            triggered.append(trigger)
    
    # Portfolio context signals
    pc = client.get("portfolio_context", {})
    
    # Concentration signal
    if pc.get("single_stock_count", 0) > 0:
        top_holding = pc.get("top_holdings", [{}])[0]
        if top_holding.get("weightPct", 0) > 30:
            if bundle["bundle_key"] == "CONCENTRATION_SOLUTION":
                score += 25
                triggered.append("high_concentration")
            elif bundle["bundle_key"] == "POST_LIQUIDITY_DEPLOYMENT":
                score += 15
    
    # Liquidity gap signal
    if "liquidity_gap" in flag_types and bundle["bundle_key"] == "LIQUIDITY_BRIDGE":
        score += 25
        triggered.append("liquidity_gap")
    
    # Fund gating signal
    if "fund_gating" in flag_types and bundle["bundle_key"] == "LIQUIDITY_BRIDGE":
        score += 20
        triggered.append("fund_gating")
    
    # Margin call risk
    if "ltv_margin_call_risk" in flag_types:
        if bundle["bundle_key"] in ["CONCENTRATION_SOLUTION", "LIQUIDITY_BRIDGE", "WEALTH_PRESERVATION"]:
            score += 15
            triggered.append("margin_call_risk")
    
    # Family office / multi-gen
    if "multi-generational" in client["life_stage"].lower() and bundle["bundle_key"] == "FAMILY_OFFICE_MULTI_GEN":
        score += 30
        triggered.append("multi_generational")
    
    # Post liquidity event
    if "post-liquidity" in client["life_stage"].lower() and bundle["bundle_key"] == "POST_LIQUIDITY_DEPLOYMENT":
        score += 30
        triggered.append("post_liquidity_event")
    
    # Sustainable profile
    if "Sustainable" in client["risk_profile"] and bundle["bundle_key"] == "SUSTAINABLE_IMPACT":
        score += 25
        triggered.append("sustainable_profile")
    
    # Growth profile
    if client["risk_profile"] == "Growth" and bundle["bundle_key"] == "GROWTH_ACCELERATION":
        score += 20
        triggered.append("growth_profile")
    
    # Conservative/Income profile
    if client["risk_profile"] in ["Conservative", "Income"] and bundle["bundle_key"] == "WEALTH_PRESERVATION":
        score += 20
        triggered.append("conservative_profile")
    
    # Balanced profile default
    if client["risk_profile"] in ["Balanced", "Balanced Growth", "Sustainable Balanced"] and bundle["bundle_key"] == "BALANCED_GROWTH":
        score += 15
        triggered.append("balanced_profile")
    
    return min(score, 100), triggered, components


def recommend_bundles_rule_based(client_payload: List[Dict], top_n: Optional[int] = None) -> Dict:
    """Deterministic rule-based bundle recommendations without LLM."""
    
    recommendations = []
    
    for client in client_payload:
        # Score all eligible bundles
        scored = []
        for bundle_key, bundle in PRODUCT_BUNDLES.items():
            # Create a copy with bundle_key for scoring
            bundle_with_key = {"bundle_key": bundle_key, **bundle}
            score, triggered, components = score_bundle_fit(client, bundle_with_key)
            if score > 0:
                # Estimate allocation (percentage of AUM based on bundle type)
                allocation_pct = 0.3 if bundle_key in ["CONCENTRATION_SOLUTION", "LIQUIDITY_BRIDGE", "POST_LIQUIDITY_DEPLOYMENT"] else 0.5
                if bundle_key == "FAMILY_OFFICE_MULTI_GEN":
                    allocation_pct = 0.8
                estimated = round(client["aum_usd"] * allocation_pct, 2)
                
                scored.append({
                    "bundle_key": bundle_key,
                    "bundle_name": bundle["name"],
                    "fit_score": score,
                    "triggered_flags": triggered,
                    "key_components": components[:4],  # Top 4 components
                    "estimated_allocation_usd": estimated,
                    "rationale": "",  # Will fill below
                })
        
        # Sort by fit score descending
        scored.sort(key=lambda x: x["fit_score"], reverse=True)
        
        if not scored:
            # Fallback: basic balanced
            scored.append({
                "bundle_key": "BALANCED_GROWTH",
                "bundle_name": PRODUCT_BUNDLES["BALANCED_GROWTH"]["name"],
                "fit_score": 50,
                "triggered_flags": [],
                "key_components": [c["product"] for c in PRODUCT_BUNDLES["BALANCED_GROWTH"]["components"][:4]],
                "estimated_allocation_usd": round(client["aum_usd"] * 0.5, 2),
                "rationale": "Default balanced allocation for unspecified profile",
            })
        
        primary = scored[0]
        complementary = scored[1:3] if len(scored) > 1 else []
        
        # Generate rationale for primary
        primary["rationale"] = generate_rationale(client, primary, primary["triggered_flags"])
        
        # Generate rationale for complementary
        for comp in complementary:
            comp["rationale"] = generate_rationale(client, comp, comp["triggered_flags"])
        
        # Portfolio context summary
        pc = client.get("portfolio_context", {})
        top_holdings = pc.get("top_holdings", [])
        top_holding_names = [h.get("name", "") for h in top_holdings[:3] if h.get("name")]
        context_summary = (
            f"AUM: ${client['aum_usd']:,.0f} | "
            f"Risk: {client['risk_profile']} | "
            f"Stage: {client['life_stage']} | "
            f"Top holdings: {', '.join(top_holding_names) if top_holding_names else 'N/A'} | "
            f"Single stock count: {pc.get('single_stock_count', 0)} | "
            f"Flags: {len(client.get('flags', []))} ({', '.join(set(f['type'] for f in client.get('flags', [])) or ['none'])})"
        )
        
        # Implementation notes
        impl_notes = generate_implementation_notes(client, primary, complementary)
        
        recommendations.append({
            "client_id": client["client_id"],
            "name": client["name"],
            "aum_usd": client["aum_usd"],
            "risk_profile": client["risk_profile"],
            "life_stage": client["life_stage"],
            "primary_bundle": primary,
            "complementary_bundles": complementary,
            "portfolio_context_summary": context_summary,
            "implementation_notes": impl_notes,
        })
    
    # Sort by AUM descending
    recommendations.sort(key=lambda x: x["aum_usd"], reverse=True)
    
    if top_n:
        recommendations = recommendations[:top_n]
    
    return {"client_recommendations": recommendations}


def generate_rationale(client: Dict, bundle_rec: Dict, triggered: List[str]) -> str:
    """Generate human-readable rationale for bundle recommendation."""
    parts = []
    
    # Profile match
    bundle_key = bundle_rec["bundle_key"]
    bundle = PRODUCT_BUNDLES[bundle_key]
    
    if client["risk_profile"] in bundle["target_profiles"]:
        parts.append(f"Matches {client['risk_profile']} risk profile")
    
    if client["life_stage"] in bundle["target_life_stages"]:
        parts.append(f"Aligned with {client['life_stage']} life stage")
    
    # Flag triggers
    if triggered:
        flag_desc = {
            "single_position_breach": "concentration breaches",
            "high_concentration": "extreme single-stock concentration (>30%)",
            "liquidity_gap": "liquidity shortfall for capital calls",
            "fund_gating": "gated fund redemption constraints",
            "margin_call_risk": "margin call proximity risk",
            "multi_generational": "multi-generational family structure",
            "post_liquidity_event": "post-liquidity event deployment need",
            "sustainable_profile": "sustainable investing mandate",
            "growth_profile": "growth-oriented mandate",
            "conservative_profile": "capital preservation mandate",
            "balanced_profile": "balanced growth mandate",
        }
        flag_reasons = [flag_desc.get(t, t) for t in triggered]
        parts.append(f"Addresses: {', '.join(flag_reasons)}")
    
    # Portfolio context
    pc = client.get("portfolio_context", {})
    if pc.get("single_stock_count", 0) > 0:
        top = pc.get("top_holdings", [{}])[0]
        if top.get("weightPct", 0) > 50:
            parts.append(f"Critical: {top.get('name', 'top holding')} at {top.get('weightPct', 0):.1f}% requires urgent diversification")
    
    return ". ".join(parts) + "."


def generate_implementation_notes(client: Dict, primary: Dict, complementary: List[Dict]) -> str:
    """Generate implementation notes."""
    notes = []
    
    # Primary bundle notes
    if primary["bundle_key"] == "CONCENTRATION_SOLUTION":
        notes.append("Phase diversification over 12 months (10% quarterly tranches) to manage market impact and tax")
        pc = client.get("portfolio_context", {})
        top = pc.get("top_holdings", [{}])[0]
        if top.get("weightPct", 0) > 50:
            notes.append(f"URGENT: {top.get('name', 'Concentrated position')} at {top.get('weightPct', 0):.1f}% exceeds all mandate limits")
    
    if primary["bundle_key"] == "LIQUIDITY_BRIDGE":
        for flag in client.get("flags", []):
            if flag["type"] == "liquidity_gap":
                notes.append(f"Liquidity gap: {flag['detail']}")
            if flag["type"] == "fund_gating":
                notes.append(f"Fund gating: {flag['detail']}")
    
    if primary["bundle_key"] == "POST_LIQUIDITY_DEPLOYMENT":
        notes.append("Deploy proceeds over 12-24 months via staged DCA; pre-approve rebalancing bands")
    
    if primary["bundle_key"] == "FAMILY_OFFICE_MULTI_GEN":
        notes.append("Establish separate sleeves with distinct risk budgets; implement family governance framework")
    
    if primary["bundle_key"] == "GROWTH_ACCELERATION":
        notes.append("Requires qualified purchaser status; illiquidity lock-up 7-10 years for PE/VC allocations")
    
    # Complementary bundle notes
    for comp in complementary:
        if comp["bundle_key"] == "CONCENTRATION_SOLUTION":
            notes.append("Complementary: Add collar structure on concentrated position while staging exit")
        elif comp["bundle_key"] == "LIQUIDITY_BRIDGE":
            notes.append("Complementary: Establish standby credit facility for capital call coverage")
    
    if not notes:
        notes.append("Standard implementation: Rebalance to target weights within 30 days; monitor mandate compliance quarterly")
    
    return " | ".join(notes)


def load_portfolio_contexts(output_dir: Path) -> Dict[str, Dict]:
    """Load portfolio context from pipeline output files."""
    contexts = {}
    for file_path in output_dir.glob("CL-*-pipeline-*.json"):
        try:
            with open(file_path) as f:
                data = json.load(f)
            client_id = data.get("newsIntelligence", {}).get("clientId")
            if client_id:
                # Keep the latest file per client
                if client_id not in contexts or file_path.stat().st_mtime > contexts[client_id]["_mtime"]:
                    contexts[client_id] = {
                        "portfolio_context": data.get("newsIntelligence", {}).get("portfolioContext", {}),
                        "scenario_analysis": data.get("scenarioAnalysis", {}),
                        "_mtime": file_path.stat().st_mtime
                    }
        except Exception:
            continue
    return contexts


def build_client_payload(signals: Dict, portfolio_contexts: Dict) -> List[Dict]:
    """Build enriched client payload for the LLM."""
    payload = []
    for client_id, client_data in signals.items():
        # Remove internal fields
        client = {k: v for k, v in client_data.items() if k not in ("max_flag_severity", "severity_weighted_exposure_usd")}
        
        # Add portfolio context if available
        if client_id in portfolio_contexts:
            pc = portfolio_contexts[client_id]["portfolio_context"]
            client["portfolio_context"] = {
                "total_value_usd": pc.get("totalValueUsd"),
                "top_holdings": pc.get("topHoldings", [])[:5],
                "top_sectors": pc.get("topSectors", []),
                "top_regions": pc.get("topRegions", []),
                "asset_classes": pc.get("assetClasses", []),
                "single_stock_count": pc.get("singleStockCount", 0),
            }
            
            # Add scenario summary
            sa = portfolio_contexts[client_id].get("scenario_analysis", {})
            if sa:
                client["scenario_summary"] = {
                    "positive_prob": sa.get("positiveScenario", {}).get("probability"),
                    "negative_prob": sa.get("negativeScenario", {}).get("probability"),
                    "key_risk": sa.get("defenseNegative", {}).get("arguments", [])[:2],
                }
        
        payload.append(client)
    return payload


def recommend_bundles(client_payload: List[Dict], top_n: Optional[int] = None) -> Dict:
    """Call LLM to recommend bundles for each client."""
    
    # Include bundle catalog in prompt
    bundles_summary = {}
    for key, bundle in PRODUCT_BUNDLES.items():
        bundles_summary[key] = {
            "name": bundle["name"],
            "description": bundle["description"],
            "target_profiles": bundle["target_profiles"],
            "target_life_stages": bundle["target_life_stages"],
            "trigger_flags": bundle.get("trigger_flags", []),
            "min_aum_usd": bundle["min_aum_usd"],
            "risk_budget": bundle["risk_budget"],
            "components": [{"product": c["product"], "code": c["code"], "allocation_pct": c["allocation_pct"], "rationale": c["rationale"]} for c in bundle["components"]],
        }
    
    n_clause = f"Return recommendations for only the top {top_n} clients by AUM." if top_n else "Return recommendations for all clients."
    
    prompt = f"""Here are the clients and their enriched profiles:

{json.dumps(client_payload, indent=2)}

Here is the product bundle catalog:

{json.dumps(bundles_summary, indent=2)}

{n_clause}

For each client, recommend:
1. ONE primary bundle (best overall fit)
2. Up to TWO complementary bundles (address specific flags/gaps)

Consider:
- Risk profile match
- Life stage match  
- AUM meets minimum
- Flags triggering specific bundles (concentration, liquidity, margin call, fund gating)
- Portfolio context (single stock concentration, sector/region concentration)
- Scenario analysis (negative probability high → more defensive bundles)

Fit score (0-100): How well the bundle matches this specific client.
Estimated allocation: Suggested USD amount from client's AUM for this bundle.
"""

    return generate_json(
        prompt=prompt,
        response_schema=RESPONSE_SCHEMA,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.1,
    )


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run bundling agent on client signals")
    parser.add_argument("--signals", default="sample_signals.json", help="Path to signals JSON")
    parser.add_argument("--output-dir", default="../output", help="Directory with pipeline outputs")
    parser.add_argument("--top-n", type=int, help="Limit to top N clients by AUM")
    parser.add_argument("--output", help="Output file path (default: stdout)")
    parser.add_argument("--use-llm", action="store_true", help="Use LLM for recommendations (requires GEMINI_API_KEY)")
    args = parser.parse_args()
    
    signals_path = Path(__file__).resolve().parents[2] / args.signals
    if not signals_path.exists():
        print(f"Signals file not found: {signals_path}")
        print("Run `python src/data_layer/signals.py <path-to-data-root>` first")
        sys.exit(1)
    
    output_dir = Path(__file__).resolve().parents[2] / args.output_dir
    
    with open(signals_path) as f:
        signals = json.load(f)
    
    portfolio_contexts = load_portfolio_contexts(output_dir)
    print(f"Loaded portfolio contexts for {len(portfolio_contexts)} clients")
    
    client_payload = build_client_payload(signals, portfolio_contexts)
    
    # Use rule-based by default, LLM only if requested and available
    if args.use_llm and LLM_AVAILABLE:
        print("Using LLM-based recommendations...")
        result = recommend_bundles(client_payload, top_n=args.top_n)
    else:
        if args.use_llm and not LLM_AVAILABLE:
            print("LLM not available (missing GEMINI_API_KEY), falling back to rule-based...")
        print("Using rule-based recommendations...")
        result = recommend_bundles_rule_based(client_payload, top_n=args.top_n)
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Results written to {args.output}")
    else:
        print(json.dumps(result, indent=2))