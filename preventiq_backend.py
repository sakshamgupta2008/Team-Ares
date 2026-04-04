#!/usr/bin/env python3
"""
PreventiQ Backend Service
=========================

A backend service for illness risk assessment that accepts JSON input
and returns structured JSON output with risk assessment reports.

Input JSON format:
{
    "state": "State Name"  // OR
    "district": "District Name",
    "state": "State Name"  // required if district is provided
}

Output JSON format:
{
    "success": true/false,
    "location": "Location string",
    "sample_size": number,
    "risk_score": {
        "percentage": float,
        "status": "string",
        "classification": "string",
        "bar_visual": "string"
    },
    "justification": [
        {
            "rank": number,
            "feature": "string",
            "importance_score": float,
            "average_value": float,
            "standard_deviation": float,
            "effect_direction": "string",
            "effect_size": "string"
        }
    ],
    "validation": {
        "model_name": "string",
        "model_accuracy": float,
        "average_risk": float,
        "risk_range": {
            "min": float,
            "max": float
        },
        "risk_variability": float,
        "confidence": "string"
    },
    "recommendations": [
        "string"
    ],
    "error": "string"  // only present if success is false
}
"""

import json
import sys
import os
import numpy as np
import pandas as pd
import warnings
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from scipy import stats
from scipy.stats import pointbiserialr

warnings.filterwarnings("ignore")

class PreventiQBackend:
    def __init__(self):
        self.df = None
        self.df_scaled = None
        self.significant_features = None
        self.best_model = None
        self.best_model_name = None
        self.predictions_df = None
        self.district_predictions_df = None
        self.t_test_df = None
        self.corr_df = None
        self.results_df = None

        # Initialize the system
        self._initialize_system()

    def _initialize_system(self):
        """Initialize the risk assessment system by loading data and training models"""
        try:
            print("🔄 Initializing PreventiQ Backend System...")

            # Load data
            data_path = "final_health_data.xlsx"
            if not os.path.exists(data_path):
                raise FileNotFoundError(f"Data file not found: {data_path}")

            self.df = pd.read_excel(data_path)
            print(f"✅ Loaded {len(self.df)} records from {data_path}")

            # Data preprocessing
            self._preprocess_data()

            # Statistical analysis
            self._perform_statistical_analysis()

            # Train models
            self._train_models()

            # Generate predictions
            self._generate_predictions()

            print("✅ PreventiQ Backend System initialized successfully!")

        except Exception as e:
            print(f"❌ Initialization failed: {str(e)}")
            raise

    def _preprocess_data(self):
        """Preprocess the data with scaling"""
        # Columns to scale
        columns_to_scale = ['age', 'household_size', 'chronic_disease', 'hypertension',
                           'diabetes', 'asthma', 'missed_visits_12m', 'missed_screenings_12m',
                           'days_since_last_visit', 'followup_delay_days', 'screening_completed',
                           'vaccination_up_to_date', 'facility_access_km', 'region_health_index']

        # Filter to ensure they are numerical
        numerical_cols = self.df.select_dtypes(include=[np.number]).columns
        columns_to_scale = [col for col in columns_to_scale if col in numerical_cols]

        # Scale the data
        scaler = StandardScaler()
        self.df_scaled = self.df.copy()
        self.df_scaled[columns_to_scale] = scaler.fit_transform(self.df[columns_to_scale])

        print(f"✅ Scaled {len(columns_to_scale)} numerical features")

    def _perform_statistical_analysis(self):
        """Perform statistical tests to identify significant features"""
        if 'ill' not in self.df_scaled.columns:
            raise ValueError("'ill' column not found in dataset")

        target = self.df_scaled['ill']
        features = self.df_scaled.select_dtypes(include=[np.number]).columns
        features = [col for col in features if col != 'ill']

        # Point-biserial correlation
        correlations = []
        for feature in features:
            corr, p_value = pointbiserialr(target, self.df_scaled[feature])
            correlations.append({
                'Feature': feature,
                'Correlation': corr,
                'P-Value': p_value,
                'Significant': 'Yes' if p_value < 0.05 else 'No'
            })

        self.corr_df = pd.DataFrame(correlations)

        # T-tests
        t_tests = []
        for feature in features:
            ill_group = self.df_scaled[target == 1][feature].dropna()
            not_ill_group = self.df_scaled[target == 0][feature].dropna()

            t_stat, p_value = stats.ttest_ind(ill_group, not_ill_group)

            mean_diff = ill_group.mean() - not_ill_group.mean()
            pooled_std = np.sqrt((ill_group.std()**2 + not_ill_group.std()**2) / 2)
            cohens_d = mean_diff / pooled_std if pooled_std != 0 else 0

            t_tests.append({
                'Feature': feature,
                'T-Statistic': t_stat,
                'P-Value': p_value,
                'Mean_Ill': ill_group.mean(),
                'Mean_NotIll': not_ill_group.mean(),
                'Cohens_d': cohens_d,
                'Significant': 'Yes' if p_value < 0.05 else 'No'
            })

        self.t_test_df = pd.DataFrame(t_tests)

        # Get significant features
        self.significant_features = self.t_test_df[self.t_test_df['P-Value'] < 0.05]['Feature'].tolist()

        print(f"✅ Identified {len(self.significant_features)} significant features")

    def _train_models(self):
        """Train multiple ML models and select the best one"""
        X = self.df_scaled[self.significant_features].fillna(self.df_scaled[self.significant_features].mean())
        y = self.df_scaled['ill']

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Train Random Forest (best performing model)
        self.best_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
        self.best_model.fit(X_train, y_train)
        self.best_model_name = "Random Forest"

        # Calculate accuracy
        y_pred = self.best_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)

        # Create results dataframe for compatibility
        self.results_df = pd.DataFrame([{
            'Model': self.best_model_name,
            'Accuracy': accuracy,
            'Precision': precision_score(y_test, y_pred, zero_division=0),
            'Recall': recall_score(y_test, y_pred, zero_division=0),
            'F1-Score': f1_score(y_test, y_pred, zero_division=0)
        }])

        print(f"✅ Trained {self.best_model_name} model with {accuracy:.4f} accuracy")

    def _generate_predictions(self):
        """Generate state and district level predictions"""
        all_states = self.df_scaled['state_or_ut'].unique()

        # State predictions
        state_predictions = []
        for state in sorted(all_states):
            state_data = self.df_scaled[self.df_scaled['state_or_ut'] == state][self.significant_features]
            state_data = state_data.fillna(state_data.mean())

            if len(state_data) > 0:
                risk_probs = self.best_model.predict_proba(state_data)[:, 1]
                avg_risk = risk_probs.mean()
                risk_percentage = avg_risk * 100
                is_ill = "ILL (Risk > 50%)" if avg_risk > 0.5 else "HEALTHY (Risk ≤ 50%)"

                state_predictions.append({
                    'State': state,
                    'Sample_Count': len(state_data),
                    'Avg_Risk_Probability': avg_risk,
                    'Risk_Percentage': risk_percentage,
                    'Status': is_ill,
                    'Max_Risk': risk_probs.max(),
                    'Min_Risk': risk_probs.min()
                })

        self.predictions_df = pd.DataFrame(state_predictions)

        # District predictions
        district_predictions = []
        for state in sorted(all_states):
            state_original_data = self.df[self.df['state_or_ut'] == state].copy()
            unique_districts = state_original_data['district_name'].unique()

            for district in sorted(unique_districts):
                district_original = state_original_data[state_original_data['district_name'] == district]
                district_indices = district_original.index
                district_scaled = self.df_scaled.loc[district_indices][self.significant_features]
                district_scaled = district_scaled.fillna(district_scaled.mean())

                if len(district_scaled) > 0:
                    risk_probs = self.best_model.predict_proba(district_scaled)[:, 1]
                    avg_risk = risk_probs.mean()
                    risk_percentage = avg_risk * 100
                    status = "ILL (Risk > 50%)" if avg_risk > 0.5 else "HEALTHY (Risk ≤ 50%)"

                    district_predictions.append({
                        'State': state,
                        'District_Name': district,
                        'Sample_Count': len(district_scaled),
                        'Avg_Risk_Probability': avg_risk,
                        'Risk_Percentage': risk_percentage,
                        'Status': status,
                        'Max_Risk': risk_probs.max(),
                        'Min_Risk': risk_probs.min()
                    })

        self.district_predictions_df = pd.DataFrame(district_predictions)

        print(f"✅ Generated predictions for {len(self.predictions_df)} states and {len(self.district_predictions_df)} districts")

    def assess_risk(self, input_data):
        """
        Assess illness risk for a given state or district

        Args:
            input_data (dict): Input JSON with 'state' and/or 'district' keys

        Returns:
            dict: Structured JSON response with risk assessment
        """
        try:
            # Validate input
            if 'state' not in input_data and 'district' not in input_data:
                return {
                    "success": False,
                    "error": "Input must contain either 'state' or 'district' field"
                }

            state = input_data.get('state')
            district = input_data.get('district')

            # Determine location and get data
            if district and not state:
                return {
                    "success": False,
                    "error": "When providing 'district', you must also provide 'state'"
                }

            if district:
                # District-level analysis
                state_data = self.df[self.df['state_or_ut'] == state]
                data_indices = state_data[state_data['district_name'] == district].index
                data = self.df_scaled.loc[data_indices].copy()
                location = f"{district}, {state}"

                if len(data) == 0:
                    return {
                        "success": False,
                        "error": f"No data found for district '{district}' in state '{state}'"
                    }

                pred_data = self.district_predictions_df[
                    (self.district_predictions_df['State'] == state) &
                    (self.district_predictions_df['District_Name'] == district)
                ].iloc[0]

            else:
                # State-level analysis
                data = self.df_scaled[self.df_scaled['state_or_ut'] == state].copy()
                location = f"{state} (All Districts)"

                if len(data) == 0:
                    return {
                        "success": False,
                        "error": f"No data found for state '{state}'"
                    }

                pred_data = self.predictions_df[self.predictions_df['State'] == state].iloc[0]

            # Get significant features data
            feature_data = data[self.significant_features].fillna(data[self.significant_features].mean())

            # Get risk predictions
            risk_probs = self.best_model.predict_proba(feature_data)[:, 1]
            avg_risk = risk_probs.mean()
            risk_percentage = avg_risk * 100

            # Create risk bar visual
            risk_bar_length = int(risk_percentage / 5)
            risk_bar = "█" * risk_bar_length + "░" * (20 - risk_bar_length)

            # Determine status
            if risk_percentage > 70:
                status = "🔴 VERY HIGH RISK"
            elif risk_percentage > 60:
                status = "🟠 HIGH RISK"
            elif risk_percentage > 50:
                status = "🟡 MODERATE-HIGH RISK"
            else:
                status = "🟢 LOW-MODERATE RISK"

            # Generate justification
            justification = []
            if hasattr(self.best_model, 'feature_importances_'):
                feature_importance_dict = dict(zip(self.significant_features, self.best_model.feature_importances_))
                top_features = sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True)[:5]

                for idx, (feature, importance) in enumerate(top_features, 1):
                    feature_values = feature_data[feature]
                    mean_val = feature_values.mean()
                    std_val = feature_values.std()

                    # Get corresponding t-test result
                    t_test_row = self.t_test_df[self.t_test_df['Feature'] == feature]
                    if len(t_test_row) > 0:
                        cohens_d = t_test_row.iloc[0]['Cohens_d']
                        direction = "↑ Higher" if cohens_d > 0 else "↓ Lower"
                        effect_size = "|Cohen's d|" if abs(cohens_d) > 0.2 else "small effect"
                    else:
                        direction = "Unknown"
                        effect_size = "unknown"

                    justification.append({
                        "rank": idx,
                        "feature": feature.upper(),
                        "importance_score": round(importance, 4),
                        "average_value": round(mean_val, 3),
                        "standard_deviation": round(std_val, 3),
                        "effect_direction": direction,
                        "effect_size": effect_size
                    })

            # Calculate validation metrics
            std_risk = risk_probs.std()
            min_risk = risk_probs.min() * 100
            max_risk = risk_probs.max() * 100

            if std_risk < 0.1:
                confidence = "🟢 HIGH - Low variation in risk scores"
            elif std_risk < 0.15:
                confidence = "🟡 MODERATE - Moderate variation in risk scores"
            else:
                confidence = "🟠 CAUTION - High variation, diverse population"

            validation = {
                "model_name": self.best_model_name,
                "model_accuracy": round(self.results_df.iloc[0]['Accuracy'], 4),
                "average_risk": round(risk_percentage, 2),
                "risk_range": {
                    "min": round(min_risk, 2),
                    "max": round(max_risk, 2)
                },
                "risk_variability": round(std_risk, 4),
                "confidence": confidence
            }

            # Generate recommendations
            recommendations = []
            if avg_risk > 0.7:
                recommendations = [
                    "⚠️ CRITICAL ATTENTION REQUIRED",
                    "Immediate health interventions recommended",
                    "Focus on high-risk factors identified above",
                    "Increase medical facility accessibility",
                    "Enhanced health screening programs"
                ]
            elif avg_risk > 0.6:
                recommendations = [
                    "⚠️ SIGNIFICANT CONCERN",
                    "Targeted health programs needed",
                    "Address top risk factors",
                    "Regular monitoring recommended"
                ]
            elif avg_risk > 0.5:
                recommendations = [
                    "⚠️ MODERATE CONCERN",
                    "Preventive measures recommended",
                    "Community health awareness programs",
                    "Focus on lifestyle improvements"
                ]
            else:
                recommendations = [
                    "✅ RELATIVELY HEALTHY",
                    "Continue existing health practices",
                    "Regular check-ups recommended",
                    "Maintain preventive care"
                ]

            # Return structured response
            return {
                "success": True,
                "location": location,
                "sample_size": len(data),
                "risk_score": {
                    "percentage": round(risk_percentage, 2),
                    "status": status,
                    "classification": "ILL ⚠️" if avg_risk > 0.5 else "HEALTHY ✅",
                    "bar_visual": risk_bar
                },
                "justification": justification,
                "validation": validation,
                "recommendations": recommendations
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Risk assessment failed: {str(e)}"
            }


def main():
    """Main function to handle command line execution"""
    if len(sys.argv) != 3:
        print("Usage: python preventiq_backend.py <input.json> <output.json>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        # Initialize the backend
        backend = PreventiQBackend()

        # Read input JSON
        with open(input_file, 'r') as f:
            input_data = json.load(f)

        # Perform risk assessment
        result = backend.assess_risk(input_data)

        # Write output JSON
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)

        if result["success"]:
            print(f"✅ Risk assessment completed for {result['location']}")
            print(f"📊 Risk Score: {result['risk_score']['percentage']}%")
            print(f"📄 Report saved to {output_file}")
        else:
            print(f"❌ Assessment failed: {result['error']}")

    except FileNotFoundError:
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"❌ Invalid JSON format in input file: {input_file}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()