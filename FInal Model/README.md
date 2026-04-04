# PreventIQ Backend — Developer Setup Guide

## Files You Received

| File | Purpose |
|---|---|
| `preventiq_backend.py` | FastAPI server — the main backend |
| `requirements.txt` | Python dependencies |
| `final_health_data.xlsx` | Dataset (must be in same folder) |
| `models/best_model.joblib` | Trained ML model |
| `models/scaler.joblib` | Feature scaler |
| `models/model_meta.json` | Feature list + importances |

---

## Setup (one time)

```bash
pip install -r requirements.txt
```

Place all files in one folder:
```
/your-project/
  preventiq_backend.py
  final_health_data.xlsx
  requirements.txt
  models/
    best_model.joblib
    scaler.joblib
    model_meta.json
```

---

## Run the server

```bash
uvicorn preventiq_backend:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

---

## API Endpoints

### POST /predict
Takes a state (required) and district (optional). Returns full risk JSON.

**State-level:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"state": "Madhya Pradesh"}'
```

**District-level:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"state": "Madhya Pradesh", "district": "Indore"}'
```

### GET /states
```bash
curl http://localhost:8000/states
```

### GET /districts/{state}
```bash
curl "http://localhost:8000/districts/Maharashtra"
```

### GET /health
```bash
curl http://localhost:8000/health
```

---

## Output JSON Structure

```json
{
  "metadata": { "district", "state", "population", "timestamp" ... },
  "ml_risk_assessment": { "current_risk_pct", "risk_level", "confidence", "prediction_interval" ... },
  "top_risk_drivers": [ { "feature", "label", "importance", "cohens_d", "contribution_to_risk" } ... ],
  "equity_vulnerability": { "equity_score", "vulnerability_level", "equity_weighted_risk" ... },
  "health_metrics": { "gap_percent", "screening_completion_rate", "healthcare_workers_per_1000" ... },
  "weather_context": { "current_condition", "impact_multiplier", "warning" ... },
  "simulation_state": { "projected_weekly_risk": [84, 79, 73 ...], "projected_risk_reduction" ... },
  "optimization_suggestions": { "recommended_allocation", "expected_outcome" ... },
  "counterfactuals": [ { "scenario", "risk_reduction", "new_risk_pct" } ... ],
  "explanation_for_ai_copilot": "Natural language summary string"
}
```

---

## Notes for the Developer

- The model file path is resolved relative to `preventiq_backend.py` — keep them in the same directory.
- Weather context is automatically determined from the current month — no external API needed.
- The `/predict` endpoint is stateless and thread-safe — safe to deploy behind a load balancer.
- CORS is open (`allow_origins=["*"]`) — restrict to your frontend domain in production.
- All 36 Indian states/UTs and 219 districts in the dataset are supported.
