# PreventiQ Backend Service

A backend service for illness risk assessment that processes JSON input and returns structured JSON output with comprehensive risk assessment reports.

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Required packages: `numpy`, `pandas`, `scikit-learn`, `scipy`
- Data file: `final_health_data.xlsx` in the same directory

### Installation
```bash
pip install numpy pandas scikit-learn scipy
```

### Usage
```bash
python preventiq_backend.py <input.json> <output.json>
```

## 📋 Input JSON Format

### State-Level Assessment
```json
{
    "state": "Maharashtra"
}
```

### District-Level Assessment
```json
{
    "district": "Mumbai",
    "state": "Maharashtra"
}
```

## 📤 Output JSON Format

```json
{
    "success": true,
    "location": "Maharashtra (All Districts)",
    "sample_size": 1537,
    "risk_score": {
        "percentage": 63.67,
        "status": "🟠 HIGH RISK",
        "classification": "ILL ⚠️",
        "bar_visual": "████████████░░░░░░░░"
    },
    "justification": [
        {
            "rank": 1,
            "feature": "OBESITY",
            "importance_score": 0.4026,
            "average_value": 0.658,
            "standard_deviation": 0.475,
            "effect_direction": "↑ Higher",
            "effect_size": "|Cohen's d|"
        }
    ],
    "validation": {
        "model_name": "Random Forest",
        "model_accuracy": 0.9902,
        "average_risk": 63.67,
        "risk_range": {
            "min": 45.2,
            "max": 78.9
        },
        "risk_variability": 0.1234,
        "confidence": "🟢 HIGH - Low variation in risk scores"
    },
    "recommendations": [
        "⚠️ SIGNIFICANT CONCERN",
        "Targeted health programs needed",
        "Address top risk factors",
        "Regular monitoring recommended"
    ]
}
```

## 🎯 Risk Assessment Categories

| Risk Percentage | Status | Color |
|----------------|--------|-------|
| > 70% | VERY HIGH RISK | 🔴 |
| 60-70% | HIGH RISK | 🟠 |
| 50-60% | MODERATE-HIGH RISK | 🟡 |
| < 50% | LOW-MODERATE RISK | 🟢 |

## 🔍 Features Analyzed

The system analyzes 19 significant health indicators:
- **Demographics**: Age, household size
- **Health Conditions**: Obesity, chronic disease, hypertension, diabetes, asthma
- **Healthcare Access**: Missed visits/screenings, facility access distance
- **Preventive Care**: Vaccinations, screenings completed
- **Regional Factors**: Region health index, geographic indicators

## 🏗️ Architecture

### Core Components
1. **Data Preprocessing**: Standard scaling of numerical features
2. **Statistical Analysis**: T-tests and correlation analysis
3. **Model Training**: Random Forest classifier (99.02% accuracy)
4. **Risk Assessment**: Probability-based risk scoring
5. **Report Generation**: Structured JSON output with justifications

### Workflow
```
Input JSON → Data Validation → Feature Extraction → Risk Prediction → Report Generation → Output JSON
```

## 📊 Model Performance

- **Algorithm**: Random Forest Classifier
- **Accuracy**: 99.02%
- **Features**: 19 significant health indicators
- **Training Data**: 80% of dataset (19,200 records)
- **Test Data**: 20% of dataset (4,800 records)

## 🧪 Testing

### Sample Commands
```bash
# Test state-level assessment
python preventiq_backend.py input_sample.json output_state.json

# Test district-level assessment
python preventiq_backend.py input_district_sample.json output_district.json
```

### Sample Files Included
- `input_sample.json` - Maharashtra state assessment
- `input_district_sample.json` - Mumbai district assessment
- `output_sample.json` - Generated assessment result

## 🚨 Error Handling

The service returns structured error responses:

```json
{
    "success": false,
    "error": "Error description message"
}
```

### Common Errors
- Missing state/district in input
- Invalid state/district names
- Missing data file
- Model initialization failures

## 🔧 Configuration

### Data File
- **Required**: `final_health_data.xlsx`
- **Location**: Same directory as the script
- **Format**: Excel file with health records

### Model Parameters
- **n_estimators**: 100 (Random Forest trees)
- **max_depth**: 10 (Tree depth limit)
- **test_size**: 0.2 (Train/test split)

## 📈 API Integration

### For Web Applications
```python
import requests
import json

# Send assessment request
response = requests.post('your-api-endpoint', json={
    "state": "Maharashtra"
})

# Process response
result = response.json()
if result['success']:
    risk_score = result['risk_score']['percentage']
    recommendations = result['recommendations']
```

### For Backend Services
```python
from preventiq_backend import PreventiQBackend

# Initialize service
backend = PreventiQBackend()

# Assess risk
result = backend.assess_risk({"state": "Maharashtra"})

# Process result
if result['success']:
    print(f"Risk: {result['risk_score']['percentage']}%")
```

## 📝 Development

### Adding New Features
1. Extend the `PreventiQBackend` class
2. Add feature extraction logic
3. Update the assessment method
4. Test with sample data

### Model Updates
1. Modify training parameters in `_train_models()`
2. Add new algorithms
3. Update feature selection logic

## 📄 License

This project is part of the PreventiQ health assessment system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:
- Check the error messages in JSON responses
- Verify input JSON format
- Ensure data file is present
- Review model performance metrics