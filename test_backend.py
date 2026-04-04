#!/usr/bin/env python3
"""
Simple test script for PreventiQ Backend
"""

import json
import sys

def test_backend():
    """Simple test to verify JSON processing"""
    # Sample input
    input_data = {
        "state": "Maharashtra"
    }

    # Sample output structure
    output_data = {
        "success": True,
        "location": "Maharashtra (All Districts)",
        "sample_size": 1537,
        "risk_score": {
            "percentage": 65.5,
            "status": "🟠 HIGH RISK",
            "classification": "ILL ⚠️",
            "bar_visual": "██████████████░░░░"
        },
        "justification": [
            {
                "rank": 1,
                "feature": "REGION_HEALTH_INDEX",
                "importance_score": 0.1234,
                "average_value": -0.234,
                "standard_deviation": 0.987,
                "effect_direction": "↑ Higher",
                "effect_size": "|Cohen's d|"
            }
        ],
        "validation": {
            "model_name": "Random Forest",
            "model_accuracy": 0.9902,
            "average_risk": 65.5,
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

    return output_data

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_backend.py <input.json> <output.json>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        # Read input
        with open(input_file, 'r') as f:
            input_data = json.load(f)

        print(f"✅ Read input: {input_data}")

        # Generate test output
        result = test_backend()

        # Write output
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)

        print(f"✅ Generated test output to {output_file}")
        print(f"📊 Sample risk score: {result['risk_score']['percentage']}%")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)