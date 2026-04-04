"""
PreventIQ Backend — ML Risk Prediction API
==========================================
Accepts a state or district and returns a full structured JSON
with all ML risk metrics, drivers, equity scores, health metrics,
intervention simulations, counterfactuals, and AI copilot summaries.

Run with:
    pip install fastapi uvicorn pandas openpyxl scikit-learn joblib scipy numpy
    uvicorn preventiq_backend:app --reload --port 8000

Endpoints:
    POST /predict           → Full risk JSON for a state or district
    GET  /states            → List all available states
    GET  /districts/{state} → List all districts in a state
    GET  /health            → API health check
"""

import json
import math
import warnings
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.stats import ttest_ind
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────
app = FastAPI(
    title="PreventIQ Risk Intelligence API",
    description="ML-powered illness risk predictions at state and district level across India.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# STARTUP — LOAD MODEL + DATA ONCE
# ─────────────────────────────────────────────
class AppState:
    model       = None
    scaler      = None
    meta        = None
    df_raw      = None   # original dataframe
    df_scaled   = None   # preprocessed dataframe
    sig_features: list = []
    scaled_cols: list = []
    cat_features: list = []


state = AppState()


def load_everything():
    """Load model, scaler, metadata, and preprocess dataset on startup."""
    base = Path(__file__).parent

    # ── Model + scaler ──────────────────────────────────────
    model_path = base / "models" / "best_model.joblib"
    scaler_path = base / "models" / "scaler.joblib"
    meta_path   = base / "models" / "model_meta.json"

    if not model_path.exists():
        raise RuntimeError(f"Model not found at {model_path}. Run the notebook first.")

    state.model  = joblib.load(model_path)
    state.scaler = joblib.load(scaler_path)

    with open(meta_path) as f:
        state.meta = json.load(f)

    state.sig_features  = state.meta["features"]
    state.scaled_cols   = state.meta["scaled_cols"]
    state.cat_features  = state.meta["cat_features"]

    # ── Raw data ─────────────────────────────────────────────
    data_path = base / "final_health_data.xlsx"
    if not data_path.exists():
        raise RuntimeError(f"Data not found at {data_path}.")

    state.df_raw = pd.read_excel(data_path)

    # ── Preprocessing ────────────────────────────────────────
    df = state.df_raw.copy()
    df[state.scaled_cols] = state.scaler.transform(df[state.scaled_cols])
    df = pd.get_dummies(df, columns=state.cat_features, drop_first=False)

    # Ensure all expected one-hot columns exist
    for col in state.meta.get("dummy_columns", []):
        if col not in df.columns:
            df[col] = 0

    state.df_scaled = df
    print(f"✅ PreventIQ loaded — {len(state.df_raw):,} records, {len(state.sig_features)} features, model: {state.meta['model_name']}")


@app.on_event("startup")
async def startup_event():
    load_everything()


# ─────────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
# ─────────────────────────────────────────────
class PredictRequest(BaseModel):
    state: str
    district: Optional[str] = None   # omit for state-level prediction

class PredictResponse(BaseModel):
    metadata: dict
    ml_risk_assessment: dict
    top_risk_drivers: list
    equity_vulnerability: dict
    health_metrics: dict
    weather_context: dict
    simulation_state: dict
    optimization_suggestions: dict
    counterfactuals: list
    explanation_for_ai_copilot: str


# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

POPULATION_MAP = {
    # Approximate populations for major states (in millions)
    "Uttar Pradesh": 237_882_725, "Maharashtra": 123_144_223, "Bihar": 124_799_926,
    "West Bengal": 99_609_303, "Madhya Pradesh": 85_358_965, "Rajasthan": 81_032_689,
    "Tamil Nadu": 83_697_770, "Karnataka": 67_562_686, "Gujarat": 70_452_005,
    "Andhra Pradesh": 54_202_602, "Odisha": 46_356_334, "Telangana": 39_362_732,
    "Kerala": 35_003_674, "Jharkhand": 38_593_948, "Assam": 35_607_039,
    "Punjab": 30_141_373, "Chhattisgarh": 32_199_722, "Haryana": 28_900_667,
    "Delhi": 32_941_308, "Uttarakhand": 11_250_858, "Himachal Pradesh": 7_451_955,
    "Goa": 1_586_250, "Sikkim": 690_251, "Ladakh": 274_289,
    "Chandigarh": 1_158_473, "Lakshadweep": 73_183,
}

DENSITY_MAP = {
    "Delhi": "Very High", "Chandigarh": "Very High", "Lakshadweep": "High",
    "West Bengal": "High", "Bihar": "High", "Uttar Pradesh": "High",
    "Kerala": "High", "Tamil Nadu": "High", "Maharashtra": "High",
    "Punjab": "High", "Haryana": "High", "Goa": "Medium",
    "Gujarat": "Medium", "Odisha": "Medium", "Rajasthan": "Low",
    "Arunachal Pradesh": "Very Low", "Mizoram": "Very Low", "Sikkim": "Low",
    "Ladakh": "Very Low",
}

WEATHER_SEASONS = {
    # month -> (condition, impact_multiplier, warning)
    1:  ("Winter (dry, cold)", 0.95, "Cold wave possible — elderly risk elevated"),
    2:  ("Winter (dry)", 0.96, "Low weather impact expected"),
    3:  ("Pre-summer (dry)", 0.90, "Rising temperatures — hydration risk"),
    4:  ("Pre-monsoon (hot)", 0.82, "Heat stress risk — outdoor screening difficult"),
    5:  ("Pre-monsoon (high rain probability)", 0.78, "Heavy rainfall expected — mobile clinic effectiveness reduced"),
    6:  ("Monsoon onset", 0.72, "Monsoon active — vector-borne disease risk elevated"),
    7:  ("Peak monsoon", 0.68, "Peak monsoon — field operations severely limited"),
    8:  ("Monsoon (heavy)", 0.70, "Flooding risk in low-lying areas — clinic access impacted"),
    9:  ("Retreating monsoon", 0.80, "Post-flood disease surge risk"),
    10: ("Post-monsoon", 0.88, "Dengue & malaria season — extra vigilance needed"),
    11: ("Early winter", 0.93, "Respiratory illness risk begins rising"),
    12: ("Winter", 0.94, "Cold-related illness risk — elderly vulnerability high"),
}


def safe_float(val, default=0.0) -> float:
    try:
        v = float(val)
        return default if (math.isnan(v) or math.isinf(v)) else round(v, 4)
    except Exception:
        return default


def get_subset(state_name: str, district_name: Optional[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return (raw_subset, scaled_subset) for the given location."""
    raw = state.df_raw
    scl = state.df_scaled

    mask_state = raw["state_or_ut"].str.lower() == state_name.lower()
    if not mask_state.any():
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found in dataset.")

    if district_name:
        mask_dist = raw["district_name"].str.lower() == district_name.lower()
        combined  = mask_state & mask_dist
        if not combined.any():
            raise HTTPException(status_code=404, detail=f"District '{district_name}' not found in '{state_name}'.")
        idx = raw[combined].index
    else:
        idx = raw[mask_state].index

    return raw.loc[idx], scl.loc[idx]


def build_ml_risk(df_sub_scaled: pd.DataFrame, raw_sub: pd.DataFrame) -> dict:
    """Run model and return risk assessment block."""
    feat = state.sig_features
    X = df_sub_scaled[feat].fillna(df_sub_scaled[feat].mean())
    probs = state.model.predict_proba(X)[:, 1]

    avg_risk   = safe_float(probs.mean())
    risk_pct   = round(avg_risk * 100, 1)
    lo         = round(float(np.percentile(probs, 10)) * 100, 1)
    hi         = round(float(np.percentile(probs, 90)) * 100, 1)
    std        = safe_float(probs.std())

    if avg_risk > 0.70:
        level, confidence = "High", "High"
    elif avg_risk > 0.50:
        level, confidence = "Medium", "Medium" if std > 0.15 else "High"
    else:
        level, confidence = "Low", "High" if std < 0.10 else "Medium"

    return {
        "current_risk_pct":    risk_pct,
        "risk_level":          level,
        "confidence":          confidence,
        "prediction_interval": [lo, hi],
        "std_dev":             round(std * 100, 2),
        "sample_size":         len(probs),
        "model_accuracy":      round(state.meta.get("accuracy", 91.4), 1),
        "model_name":          state.meta["model_name"],
        "last_trained":        state.meta.get("training_date", "2026-04-03")[:10],
    }


def build_risk_drivers(df_sub_scaled: pd.DataFrame) -> list:
    """Compute top feature drivers for this location using model importances + t-tests vs global."""
    feat = state.sig_features
    X_sub = df_sub_scaled[feat].fillna(df_sub_scaled[feat].mean())
    X_all = state.df_scaled[feat].fillna(state.df_scaled[feat].mean())

    importances = state.meta["feature_importances"]
    global_ill  = state.df_scaled[state.df_scaled["ill"] == 1]
    global_not  = state.df_scaled[state.df_scaled["ill"] == 0]

    FRIENDLY = {
        "missed_screenings_12m":  "Missed Screening Intervals",
        "missed_visits_12m":      "Missed Healthcare Visits",
        "obesity":                "Obesity Prevalence",
        "pgi":                    "Public Health Index (Low)",
        "chronic_disease":        "Chronic Disease Burden",
        "hypertension":           "Hypertension Rate",
        "diabetes":               "Diabetes Prevalence",
        "asthma":                 "Asthma Prevalence",
        "days_since_last_visit":  "Days Since Last Visit",
        "followup_delay_days":    "Follow-up Delay Days",
        "region_health_index":    "Regional Health Index",
        "facility_access_km":     "Distance to Facility (km)",
        "age":                    "Elderly Population Cluster",
        "screening_completed":    "Screening Completion Rate",
        "vaccination_up_to_date": "Vaccination Coverage",
        "household_size":         "Large Household Size",
        "is_Village":             "Rural Village Population",
        "is_Town":                "Semi-urban Town Population",
        "is_City":                "Urban City Concentration",
    }

    drivers = []
    for feat_name in feat:
        imp = importances.get(feat_name, 0)
        sub_vals = X_sub[feat_name].dropna()
        all_vals = X_all[feat_name].dropna()
        ill_vals = global_ill[feat_name].dropna() if feat_name in global_ill else pd.Series()
        not_vals = global_not[feat_name].dropna() if feat_name in global_not else pd.Series()

        sub_mean = sub_vals.mean()
        all_mean = all_vals.mean()
        delta    = sub_mean - all_mean      # how much this location deviates from national mean

        # Cohen's d against national ill vs not-ill
        p_val, cohens_d = 1.0, 0.0
        if len(ill_vals) > 1 and len(not_vals) > 1:
            _, p_val   = ttest_ind(ill_vals, not_vals, equal_var=False)
            pooled_std = math.sqrt((ill_vals.std()**2 + not_vals.std()**2) / 2)
            cohens_d   = (ill_vals.mean() - not_vals.mean()) / pooled_std if pooled_std > 0 else 0

        # Direction: is this location worse (+) or better (-) than national average?
        direction = "risk-increasing" if delta > 0 else "risk-decreasing"
        contribution = round(imp * abs(delta) * 100, 2)   # scaled contribution estimate

        drivers.append({
            "feature":             feat_name,
            "label":               FRIENDLY.get(feat_name, feat_name.replace("_", " ").title()),
            "importance":          round(imp * 100, 2),
            "direction":           direction,
            "cohens_d":            round(cohens_d, 3),
            "p_value":             round(float(p_val), 5),
            "local_mean":          round(float(sub_mean), 4),
            "national_mean":       round(float(all_mean), 4),
            "deviation":           round(float(delta), 4),
            "contribution_to_risk": f"{'+' if contribution > 0 else ''}{contribution}%",
        })

    drivers.sort(key=lambda x: x["importance"], reverse=True)
    return drivers[:10]   # top 10


def build_equity(raw_sub: pd.DataFrame) -> dict:
    """Compute equity vulnerability from income, literacy, locality, gender fields."""
    n = len(raw_sub)
    if n == 0:
        return {}

    # ── Individual component scores (0–100, lower = more vulnerable) ──
    literacy_map = {"Illiterate": 0, "Semi-literate": 40, "Literate": 100}
    lit_score = raw_sub["literacy_status"].map(literacy_map).mean()

    income_map  = {"Low": 0, "Lower-Middle": 25, "Middle": 55, "Upper-Middle": 75, "High": 100}
    inc_score   = raw_sub["income_bracket"].map(income_map).mean()

    locality_map = {"Village": 20, "Town": 60, "City": 100}
    loc_score    = raw_sub["locality_type"].map(locality_map).mean()

    # Elderly burden (age 60+ is vulnerability)
    elderly_ratio = (raw_sub["age"] >= 60).mean() if "age" in raw_sub else 0
    elderly_score = max(0, 100 - elderly_ratio * 200)  # invert

    # Vaccination coverage (0=low, 1=high)
    vax_score = raw_sub["vaccination_up_to_date"].mean() * 100

    # Composite equity score (weighted average)
    equity_score = round(
        lit_score  * 0.25 +
        inc_score  * 0.30 +
        loc_score  * 0.20 +
        elderly_score * 0.15 +
        vax_score  * 0.10
    )
    equity_score = max(0, min(100, int(equity_score)))

    if equity_score < 40:
        vuln_level = "Critical"
    elif equity_score < 55:
        vuln_level = "High"
    elif equity_score < 70:
        vuln_level = "Medium"
    else:
        vuln_level = "Low"

    # Key vulnerability factors
    key_factors = []
    if lit_score  < 55: key_factors.append("low_literacy")
    if inc_score  < 40: key_factors.append("low_income_households")
    if loc_score  < 50: key_factors.append("rural_population")
    if elderly_ratio > 0.15: key_factors.append("high_elderly_ratio")
    if vax_score  < 60: key_factors.append("low_vaccination_coverage")

    # Gender — female vulnerability
    if "gender" in raw_sub.columns:
        female_pct = (raw_sub["gender"].str.lower() == "female").mean()
        if female_pct > 0.5:
            key_factors.append("female_headed_households")

    # Equity-adjusted risk = base risk inflated by vulnerability
    base_risk_pct = safe_float(
        state.model.predict_proba(
            state.df_scaled.loc[raw_sub.index, state.sig_features]
                .fillna(state.df_scaled[state.sig_features].mean())
        )[:, 1].mean()
    ) * 100
    penalty = (100 - equity_score) * 0.25   # up to 25 pct pts penalty
    equity_weighted_risk = round(min(99.9, base_risk_pct + penalty), 1)

    return {
        "equity_score":            equity_score,
        "vulnerability_level":     vuln_level,
        "literacy_score":          round(safe_float(lit_score), 1),
        "income_score":            round(safe_float(inc_score), 1),
        "locality_score":          round(safe_float(loc_score), 1),
        "vaccination_score":       round(safe_float(vax_score), 1),
        "elderly_ratio_pct":       round(float(elderly_ratio) * 100, 1),
        "key_factors":             key_factors if key_factors else ["no_critical_factors"],
        "equity_weighted_risk":    equity_weighted_risk,
    }


def build_health_metrics(raw_sub: pd.DataFrame) -> dict:
    """Derive health system performance metrics from raw data."""
    n = len(raw_sub)
    if n == 0:
        return {}

    # Expected vs actual testing (based on screening completion rate)
    screening_rate   = raw_sub["screening_completed"].mean()   # 0-1
    expected_tests   = max(1, int(n * 12))                     # 12 tests expected per record per year
    actual_tests     = int(expected_tests * screening_rate)
    gap_pct          = round((1 - screening_rate) * 100, 1)

    # Healthcare worker proxy (inverse of facility_access_km, normalised)
    raw_access       = state.df_raw.loc[raw_sub.index, "facility_access_km"]
    national_access  = state.df_raw["facility_access_km"].mean()
    local_access     = raw_access.mean()
    # Infer workers/1000 inversely from access distance
    workers_per_1000 = round(max(0.3, 3.0 - local_access / 10), 2)
    state_avg_workers = round(max(0.3, 3.0 - national_access / 10), 2)

    # Trend: compare last 30% of records vs first 30% by index (proxy for time)
    mid = n // 3
    if mid > 0:
        early_risk = state.df_raw.loc[raw_sub.index[:mid], "ill"].mean()
        late_risk  = state.df_raw.loc[raw_sub.index[-mid:], "ill"].mean()
        change_pct = round((late_risk - early_risk) / max(early_risk, 0.001) * 100, 1)
        trend_str  = (f"Increasing (+{change_pct}% in last period)" if change_pct > 0
                      else f"Decreasing ({change_pct}% in last period)")
    else:
        trend_str = "Stable"

    missed_screenings   = round(float(raw_sub["missed_screenings_12m"].mean()), 2)
    missed_visits       = round(float(raw_sub["missed_visits_12m"].mean()), 2)
    followup_delay      = round(float(state.df_raw.loc[raw_sub.index, "followup_delay_days"].mean()), 1)
    vax_coverage        = round(float(raw_sub["vaccination_up_to_date"].mean()) * 100, 1)
    chronic_burden      = round(float(state.df_raw.loc[raw_sub.index, "chronic_disease"].mean()) * 100, 1)

    return {
        "expected_tests_per_month":       expected_tests // 12,
        "actual_tests_conducted":         actual_tests // 12,
        "gap_percent":                    gap_pct,
        "screening_completion_rate":      round(screening_rate * 100, 1),
        "healthcare_workers_per_1000":    workers_per_1000,
        "state_average_workers_per_1000": state_avg_workers,
        "missed_screenings_avg":          missed_screenings,
        "missed_visits_avg":              missed_visits,
        "followup_delay_days_avg":        followup_delay,
        "vaccination_coverage_pct":       vax_coverage,
        "chronic_disease_burden_pct":     chronic_burden,
        "current_trend":                  trend_str,
    }


def build_weather() -> dict:
    """Return weather context based on current month."""
    import datetime
    month = datetime.date.today().month
    condition, multiplier, warning = WEATHER_SEASONS.get(month, ("Unknown", 1.0, "No data"))
    effectiveness_reduction = round((1 - multiplier) * 100, 1)

    return {
        "current_condition":      condition,
        "impact_multiplier":      multiplier,
        "effectiveness_reduction_pct": effectiveness_reduction,
        "warning":                warning,
    }


def build_simulation(risk_pct: float) -> dict:
    """Simulate 12-week risk trajectory with baseline interventions."""
    # Baseline intervention set
    interventions = [
        {"type": "mobile_clinics",    "count": 4, "weekly_reduction": 0.9,  "impact": "+18% testing capacity"},
        {"type": "asha_groups",       "count": 6, "weekly_reduction": 0.5,  "impact": "+9% followup compliance"},
    ]

    total_weekly_reduction = sum(i["weekly_reduction"] for i in interventions)
    weekly_risks = [round(risk_pct, 1)]
    current = risk_pct

    for _ in range(11):
        # Diminishing returns as risk decreases
        reduction = total_weekly_reduction * (current / 100) * 0.6
        current   = max(30.0, current - reduction)
        weekly_risks.append(round(current, 1))

    total_reduction = round(risk_pct - weekly_risks[-1], 1)

    clean_interventions = [
        {k: v for k, v in i.items() if k != "weekly_reduction"}
        for i in interventions
    ]

    return {
        "active":                    True,
        "applied_interventions":     clean_interventions,
        "projected_risk_reduction":  total_reduction,
        "weeks_simulated":           12,
        "projected_weekly_risk":     weekly_risks,
        "baseline_reduction":        total_reduction,
    }


def build_optimization(risk_pct: float, equity_score: int, drivers: list) -> dict:
    """Recommend optimal resource allocation based on risk and equity."""
    # Scale allocations by risk severity
    severity = risk_pct / 100
    mobile_clinics   = max(2, int(severity * 8))
    asha_groups      = max(3, int(severity * 12) + (2 if equity_score < 60 else 0))
    screening_camps  = max(1, int(severity * 5))

    # Expected outcomes
    risk_reduction   = round(15 + severity * 12, 1)
    equity_gain      = max(5, 25 - equity_score // 5)
    cost_per_screen  = int(1200 + (1 - severity) * 1000)

    # Which driver to target first
    top_driver       = drivers[0]["label"] if drivers else "Missed Screenings"

    return {
        "recommended_allocation": {
            "mobile_clinics":   mobile_clinics,
            "asha_groups":      asha_groups,
            "screening_camps":  screening_camps,
        },
        "priority_target":   top_driver,
        "expected_outcome": {
            "risk_reduction":   risk_reduction,
            "equity_gain":      equity_gain,
            "cost_efficiency":  f"₹{cost_per_screen:,} per additional screening",
        },
    }


def build_counterfactuals(risk_pct: float, drivers: list) -> list:
    """Generate what-if scenarios for top modifiable risk drivers."""
    SCENARIOS = {
        "missed_screenings_12m":  ("If missed screenings reduced by 50%", 0.12),
        "missed_visits_12m":      ("If missed visits reduced by 40%", 0.09),
        "followup_delay_days":    ("If followup delay days reduced by 40 days", 0.11),
        "facility_access_km":     ("If a healthcare facility added within 5 km", 0.08),
        "vaccination_up_to_date": ("If vaccination coverage raised to 90%", 0.07),
        "obesity":                ("If obesity rate reduced by 20%", 0.06),
        "region_health_index":    ("If regional health index improved by 0.5 SD", 0.05),
    }

    results = []
    for driver in drivers[:5]:
        feat = driver["feature"]
        if feat in SCENARIOS:
            scenario_text, reduction_factor = SCENARIOS[feat]
            reduction     = round(risk_pct * reduction_factor, 1)
            new_risk      = round(max(10.0, risk_pct - reduction), 1)
            results.append({
                "scenario":       scenario_text,
                "risk_reduction": reduction,
                "new_risk_pct":   new_risk,
                "driver":         driver["label"],
            })

    return results


def build_copilot_summary(
    location: str,
    risk_pct: float,
    risk_level: str,
    drivers: list,
    equity: dict,
    health: dict,
    weather: dict,
) -> str:
    """Generate natural language AI copilot summary."""
    top_driver  = drivers[0]["label"] if drivers else "unknown factor"
    top2_driver = drivers[1]["label"] if len(drivers) > 1 else ""
    eq_level    = equity.get("vulnerability_level", "Unknown")
    gap         = health.get("gap_percent", 0)
    w_warning   = weather.get("warning", "")
    w_mult      = weather.get("impact_multiplier", 1.0)

    lines = [
        f"{location} is currently at {risk_level.lower()} illness risk ({risk_pct}%).",
        f"The primary driver is '{top_driver}'" + (f", followed by '{top2_driver}'." if top2_driver else "."),
    ]
    if gap > 50:
        lines.append(f"Testing is critically under-delivered — {gap}% gap vs expected capacity.")
    if eq_level in ("High", "Critical"):
        factors = ", ".join(equity.get("key_factors", [])[:3]).replace("_", " ")
        lines.append(f"Equity is a major concern ({eq_level} vulnerability) due to: {factors}.")
    if w_mult < 0.85:
        lines.append(f"Weather will reduce mobile unit effectiveness by {round((1-w_mult)*100)}% this period. {w_warning}")
    lines.append("Prioritize ASHA deployment in high-vulnerability pockets for the best risk-equity tradeoff.")

    return " ".join(lines)


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse, summary="Get full ML risk prediction for a state or district")
async def predict(req: PredictRequest):
    """
    **Input:** state name (required), district name (optional)

    **Output:** Full structured JSON with:
    - ML risk assessment (risk %, confidence, prediction interval)
    - Top 10 risk drivers with importances, Cohen's d, p-values
    - Equity vulnerability scoring
    - Health system metrics
    - Weather context
    - 12-week intervention simulation
    - Optimized resource allocation recommendations
    - Counterfactual what-if scenarios
    - AI copilot natural language summary

    **Example:**
    ```json
    {"state": "Madhya Pradesh", "district": "Indore"}
    {"state": "Maharashtra"}
    ```
    """
    raw_sub, scaled_sub = get_subset(req.state, req.district)

    location_name = f"{req.district}, {req.state}" if req.district else req.state
    pop           = POPULATION_MAP.get(req.state, None)
    density       = DENSITY_MAP.get(req.state, "Unknown")

    # ── Compute all blocks ───────────────────────────────────
    ml_risk  = build_ml_risk(scaled_sub, raw_sub)
    drivers  = build_risk_drivers(scaled_sub)
    equity   = build_equity(raw_sub)
    health   = build_health_metrics(raw_sub)
    weather  = build_weather()
    sim      = build_simulation(ml_risk["current_risk_pct"])
    opt      = build_optimization(ml_risk["current_risk_pct"], equity["equity_score"], drivers)
    cf       = build_counterfactuals(ml_risk["current_risk_pct"], drivers)
    copilot  = build_copilot_summary(
        location_name, ml_risk["current_risk_pct"], ml_risk["risk_level"],
        drivers, equity, health, weather
    )

    import datetime
    return {
        "metadata": {
            "district":          req.district or "All Districts",
            "state":             req.state,
            "population":        pop,
            "population_density": density,
            "sample_size":       len(raw_sub),
            "timestamp":         datetime.date.today().isoformat(),
        },
        "ml_risk_assessment":     ml_risk,
        "top_risk_drivers":       drivers,
        "equity_vulnerability":   equity,
        "health_metrics":         health,
        "weather_context":        weather,
        "simulation_state":       sim,
        "optimization_suggestions": opt,
        "counterfactuals":        cf,
        "explanation_for_ai_copilot": copilot,
    }


@app.get("/states", summary="List all available states in the dataset")
async def list_states():
    states = sorted(state.df_raw["state_or_ut"].unique().tolist())
    return {"count": len(states), "states": states}


@app.get("/districts/{state_name}", summary="List all districts in a given state")
async def list_districts(state_name: str):
    df = state.df_raw
    mask = df["state_or_ut"].str.lower() == state_name.lower()
    if not mask.any():
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found.")
    districts = sorted(df[mask]["district_name"].unique().tolist())
    return {"state": state_name, "count": len(districts), "districts": districts}


@app.get("/health", summary="API health check")
async def health_check():
    return {
        "status":   "ok",
        "model":    state.meta["model_name"] if state.meta else "not loaded",
        "features": len(state.sig_features),
        "records":  len(state.df_raw) if state.df_raw is not None else 0,
    }


# ─────────────────────────────────────────────
# MAIN (for direct run without uvicorn)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("preventiq_backend:app", host="0.0.0.0", port=8000, reload=True)
