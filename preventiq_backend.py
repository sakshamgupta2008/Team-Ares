"""
PreventIQ Backend v3 — Cache-Powered Risk API
=============================================
Takes state or district as JSON input → returns full risk JSON instantly.

The notebook (PreventiQModel_Final.ipynb) precomputes everything and saves
it to `preventiq_cache.json`. This backend just looks it up — no model
loading on each request, sub-millisecond response times.

SETUP:
    pip install fastapi uvicorn

RUN:
    uvicorn preventiq_backend:app --reload --port 8000

DOCS:
    http://localhost:8000/docs

FILES NEEDED (all in same folder as this script):
    preventiq_cache.json
"""

import json
import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

POPULATION_MAP = {
    "Uttar Pradesh": 237_882_725,    "Maharashtra": 123_144_223,
    "Bihar": 124_799_926,            "West Bengal": 99_609_303,
    "Madhya Pradesh": 85_358_965,    "Rajasthan": 81_032_689,
    "Tamil Nadu": 83_697_770,        "Karnataka": 67_562_686,
    "Gujarat": 70_452_005,           "Andhra Pradesh": 54_202_602,
    "Odisha": 46_356_334,            "Telangana": 39_362_732,
    "Kerala": 35_003_674,            "Jharkhand": 38_593_948,
    "Assam": 35_607_039,             "Punjab": 30_141_373,
    "Chhattisgarh": 32_199_722,      "Haryana": 28_900_667,
    "Delhi": 32_941_308,             "Uttarakhand": 11_250_858,
    "Himachal Pradesh": 7_451_955,   "Goa": 1_586_250,
    "Sikkim": 690_251,               "Ladakh": 274_289,
    "Chandigarh": 1_158_473,         "Lakshadweep": 73_183,
    "Arunachal Pradesh": 1_570_458,  "Manipur": 3_091_545,
    "Meghalaya": 3_366_710,          "Mizoram": 1_239_244,
    "Nagaland": 2_249_695,           "Tripura": 4_169_794,
    "Andaman and Nicobar Islands": 417_036,
    "Dadra and Nagar Haveli and Daman and Diu": 615_724,
    "Jammu and Kashmir": 13_606_320, "Puducherry": 1_413_542,
}

DENSITY_MAP = {
    "Delhi": "Very High", "Chandigarh": "Very High",
    "West Bengal": "High", "Bihar": "High", "Uttar Pradesh": "High",
    "Kerala": "High", "Tamil Nadu": "High", "Maharashtra": "High",
    "Punjab": "High", "Haryana": "High", "Lakshadweep": "High",
    "Goa": "Medium", "Gujarat": "Medium", "Andhra Pradesh": "Medium",
    "Odisha": "Medium", "Jharkhand": "Medium", "Karnataka": "Medium",
    "Assam": "Medium", "Tripura": "Medium",
    "Rajasthan": "Low", "Madhya Pradesh": "Low", "Chhattisgarh": "Low",
    "Uttarakhand": "Low", "Himachal Pradesh": "Low", "Manipur": "Low",
    "Meghalaya": "Low", "Nagaland": "Low", "Sikkim": "Low",
    "Jammu and Kashmir": "Low", "Andaman and Nicobar Islands": "Low",
    "Arunachal Pradesh": "Very Low", "Mizoram": "Very Low", "Ladakh": "Very Low",
}

app = FastAPI(
    title="PreventIQ Risk Intelligence API",
    description="ML-powered illness risk predictions at state and district level across India.",
    version="3.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

CACHE: dict = {}

@app.on_event("startup")
async def load_cache():
    cache_path = Path(__file__).parent / "preventiq_cache.json"
    if not cache_path.exists():
        raise RuntimeError("preventiq_cache.json not found. Run PreventiQModel_Final.ipynb first.")
    with open(cache_path) as f:
        CACHE.update(json.load(f))
    n_s = len(CACHE.get("states", {}))
    n_d = sum(len(v) for v in CACHE.get("districts", {}).values())
    print(f"✅ Cache loaded — {n_s} states, {n_d} districts")


class PredictRequest(BaseModel):
    state:    str
    district: Optional[str] = None

    class Config:
        json_schema_extra = {
            "examples": [
                {"state": "Madhya Pradesh", "district": "Indore"},
                {"state": "Maharashtra"},
            ]
        }


@app.post("/predict", summary="Full risk prediction for a state or district")
async def predict(req: PredictRequest):
    """
    Input JSON: {"state": "Madhya Pradesh", "district": "Indore"}
    or state-only: {"state": "Maharashtra"}

    Returns the complete PreventIQ risk schema with all 10 blocks.
    """
    states_cache    = CACHE.get("states", {})
    districts_cache = CACHE.get("districts", {})

    # Case-insensitive state match
    state_key = req.state.strip().lower()
    matched_state_key = next(
        (k for k in states_cache if k == state_key or k.replace(" ","") == state_key.replace(" ","")),
        None
    )
    if matched_state_key is None:
        raise HTTPException(status_code=404, detail={
            "error": f"State '{req.state}' not found.",
            "available_states": sorted(v["_display_name"] for v in states_cache.values()),
        })

    state_data    = states_cache[matched_state_key]
    state_display = state_data["_display_name"]

    if req.district:
        dist_key  = req.district.strip().lower()
        dist_map  = districts_cache.get(matched_state_key, {})
        matched_d = next(
            (k for k in dist_map if k == dist_key or k.replace(" ","") == dist_key.replace(" ","")),
            None
        )
        if matched_d is None:
            raise HTTPException(status_code=404, detail={
                "error": f"District '{req.district}' not found in '{state_display}'.",
                "available_districts": sorted(v["_display_name"] for v in dist_map.values()),
            })
        data             = dist_map[matched_d]
        district_display = data["_display_name"]
        sample_size      = data["sample_size"]
    else:
        data             = state_data
        district_display = None
        sample_size      = state_data["sample_size"]

    return {
        "metadata": {
            "district":           district_display or "All Districts",
            "state":              state_display,
            "population":         POPULATION_MAP.get(state_display),
            "population_density": DENSITY_MAP.get(state_display, "Unknown"),
            "sample_size":        sample_size,
            "timestamp":          datetime.date.today().isoformat(),
        },
        "ml_risk_assessment":         data["ml_risk_assessment"],
        "top_risk_drivers":           data["top_risk_drivers"],
        "equity_vulnerability":       data["equity_vulnerability"],
        "health_metrics":             data["health_metrics"],
        "weather_context":            data["weather_context"],
        "simulation_state":           data["simulation_state"],
        "optimization_suggestions":   data["optimization_suggestions"],
        "counterfactuals":            data["counterfactuals"],
        "explanation_for_ai_copilot": data["explanation_for_ai_copilot"],
    }


@app.get("/states", summary="All states ranked by risk percentage")
async def list_states():
    out = sorted(
        [{"state": v["_display_name"],
          "risk_pct": v["ml_risk_assessment"]["current_risk_pct"],
          "risk_level": v["ml_risk_assessment"]["risk_level"],
          "equity_score": v["equity_vulnerability"]["equity_score"],
          "districts": v["districts"],
          "sample_size": v["sample_size"]}
         for v in CACHE.get("states", {}).values()],
        key=lambda x: x["risk_pct"], reverse=True
    )
    return {"count": len(out), "states": out}


@app.get("/districts/{state_name}", summary="All districts in a state ranked by risk")
async def list_districts(state_name: str):
    key = state_name.strip().lower()
    if key not in CACHE.get("districts", {}):
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found.")
    out = sorted(
        [{"district": v["_display_name"], "state": v["_state_display"],
          "risk_pct": v["ml_risk_assessment"]["current_risk_pct"],
          "risk_level": v["ml_risk_assessment"]["risk_level"],
          "equity_score": v["equity_vulnerability"]["equity_score"],
          "sample_size": v["sample_size"]}
         for v in CACHE["districts"][key].values()],
        key=lambda x: x["risk_pct"], reverse=True
    )
    return {"state": state_name, "count": len(out), "districts": out}


@app.get("/leaderboard", summary="All states ranked by risk — for dashboard overview")
async def leaderboard():
    rows = sorted(
        [{"state": v["_display_name"],
          "risk_pct": v["ml_risk_assessment"]["current_risk_pct"],
          "risk_level": v["ml_risk_assessment"]["risk_level"],
          "equity_weighted_risk": v["equity_vulnerability"]["equity_weighted_risk"],
          "vulnerability_level": v["equity_vulnerability"]["vulnerability_level"],
          "top_driver": v["top_risk_drivers"][0]["label"] if v["top_risk_drivers"] else None}
         for v in CACHE.get("states", {}).values()],
        key=lambda x: x["risk_pct"], reverse=True
    )
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return {"total": len(rows), "leaderboard": rows}


@app.get("/health", summary="API health check")
async def health():
    return {
        "status": "ok",
        "states": len(CACHE.get("states", {})),
        "districts": sum(len(v) for v in CACHE.get("districts", {}).values()),
        "timestamp": datetime.datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("preventiq_backend:app", host="0.0.0.0", port=8000, reload=True)
