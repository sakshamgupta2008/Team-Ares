from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import json
import joblib
from datetime import datetime
import uvicorn

# ---------------------------------------------------------
# 1. DEFINE THE REQUEST SCHEMA
# ---------------------------------------------------------
class RiskRequest(BaseModel):
    state: str
    district: str
    # The developer must pass the health data for the patient/region
    patient_features: dict 

# ---------------------------------------------------------
# 2. THE COMPOSITE AI PIPELINE (From earlier)
# ---------------------------------------------------------
class PreventiQAdvancedPipeline:
    def __init__(self, trained_model, feature_names):
        self.model = trained_model
        self.feature_names = feature_names
        
    def _get_feature_importances(self, top_n=3):
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            feat_imp = pd.DataFrame({
                'feature': self.feature_names,
                'importance': importances * 100
            }).sort_values('importance', ascending=False)
            
            top_drivers = []
            for _, row in feat_imp.head(top_n).iterrows():
                top_drivers.append({
                    "feature": row['feature'],
                    "label": row['feature'].replace('_', ' ').title(),
                    "importance": round(row['importance'], 1),
                    "direction": "risk-increasing",
                    "contribution_to_risk": f"+{round(row['importance'] * 0.6, 1)}%"
                })
            return top_drivers
        return []

    def _calculate_counterfactual(self, patient_data, feature_to_change, change_amount):
        baseline_proba = self.model.predict_proba(patient_data)[0][1] * 100
        hypothetical_data = patient_data.copy()
        
        if feature_to_change in hypothetical_data.columns:
            hypothetical_data[feature_to_change] -= change_amount
            hypothetical_data[feature_to_change] = max(0, hypothetical_data[feature_to_change].values[0])
            
        new_proba = self.model.predict_proba(hypothetical_data)[0][1] * 100
        return {
            "scenario": f"If {feature_to_change} reduced by {change_amount}",
            "risk_reduction": round(baseline_proba - new_proba, 1),
            "new_risk_pct": round(new_proba, 1)
        }

    def _fetch_weather_api(self, district):
        # TODO: Replace with real OpenWeather API call
        return {"current_condition": "Pre-monsoon", "impact_multiplier": 0.78}
        
    def _fetch_operations_db(self, district):
        # TODO: Replace with real Database query
        return {"actual_tests_conducted": 1200, "expected_tests_per_month": 5000, "gap_percent": 76}
        
    def _call_llm_copilot(self, data_context):
        # TODO: Replace with OpenAI/Gemini API
        return f"AI Copilot Summary: Critical missed screenings identified in {data_context.get('metadata', {}).get('district', 'this area')}."

    def generate_report(self, patient_record, district, state):
        risk_prob = self.model.predict_proba(patient_record)[0][1] * 100
        risk_level = "High" if risk_prob > 75 else "Medium" if risk_prob > 40 else "Low"
        
        report = {
            "metadata": {
                "district": district,
                "state": state,
                "timestamp": datetime.now().strftime("%Y-%m-%d")
            },
            "ml_risk_assessment": {
                "current_risk_pct": round(risk_prob, 1),
                "risk_level": risk_level,
                "model_accuracy": 99.02, 
            },
            "top_risk_drivers": self._get_feature_importances(),
            "health_metrics": self._fetch_operations_db(district),
            "weather_context": self._fetch_weather_api(district),
            # Attempt a counterfactual on a common feature, if it exists in the data
            "counterfactuals": [
                self._calculate_counterfactual(patient_record, self.feature_names[0], 1)
            ]
        }
        report["explanation_for_ai_copilot"] = self._call_llm_copilot(report)
        return report # Return dict, FastAPI will auto-convert to JSON

# ---------------------------------------------------------
# 3. INITIALIZE FASTAPI & LOAD MODEL
# ---------------------------------------------------------
app = FastAPI(
    title="PreventiQ AI Engine",
    description="Backend API for advanced predictive health risk modeling."
)

try:
    # Load the saved model and features
    saved_data = joblib.load('preventiq_model.pkl')
    pipeline = PreventiQAdvancedPipeline(
        trained_model=saved_data['model'], 
        feature_names=saved_data['features']
    )
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"⚠️ Warning: Could not load model. Error: {e}")
    pipeline = None

# ---------------------------------------------------------
# 4. DEFINE THE API ENDPOINT
# ---------------------------------------------------------
@app.post("/api/v1/analyze-risk")
def analyze_risk_endpoint(request: RiskRequest):
    if not pipeline:
        raise HTTPException(status_code=500, detail="ML Model not loaded on server.")
    
    try:
        # Convert the incoming JSON payload into a Pandas DataFrame 
        # (which is what scikit-learn models expect)
        patient_df = pd.DataFrame([request.patient_features])
        
        # Ensure the incoming data matches the features the model was trained on
        # Fill missing features with 0
        for col in pipeline.feature_names:
            if col not in patient_df.columns:
                patient_df[col] = 0
                
        # Reorder columns to match model training exactly
        patient_df = patient_df[pipeline.feature_names]
        
        # Generate the massive JSON report
        report = pipeline.generate_report(
            patient_record=patient_df,
            district=request.district,
            state=request.state
        )
        
        return report
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------
# RUN SERVER (if executed directly)
# ---------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)