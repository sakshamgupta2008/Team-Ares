[Hacksagon Template.pptx.pdf](https://github.com/user-attachments/files/26323472/Hacksagon.Template.pptx.pdf)
PreventiQ – Predictive Public Healthcare Analytics

PreventiQ is an AI-powered decision support system designed to transform preventive healthcare in low-resource settings. It leverages real-world government health data to identify invisible gaps in care and predict health risks before they escalate into emergencies.

🧠 Problem Statement

Rural healthcare systems don’t just fail due to lack of infrastructure—they fail earlier and silently.

Current systems track who comes for care

But ignore who should have come but didn’t
These missed preventive opportunities lead to:
🚨 Emergency cases
📈 Higher mortality
💸 Avoidable healthcare costs

Preventive gaps remain invisible until it's too late.

💡 Solution

PreventiQ introduces a predictive analytics platform that:

🔍 Uses routine patient data to predict chronic disease progression
⚠️ Identifies patients likely to deteriorate before emergencies occur
🧾 Applies Explainable AI (XAI) to justify risk predictions
🏥 Supports doctors & policymakers with actionable insights

👉 Focus: Decision Support (not diagnosis) → ensures ethical adoption

⚙️ System Workflow

The system follows a structured pipeline:

Data Ingestion
Collects government health data periodically
Expected Care Modeling
Estimates required screenings, visits, immunizations
Gap Detection Engine
Compares expected vs actual → detects missed care
Trend Analysis Layer
Filters noise using multi-month patterns
Risk Scoring & Ranking
Assigns risk levels to regions/populations
Planner Dashboard
Displays high-risk areas for decision-makers
Continuous Update Cycle
Keeps improving with new data

✨ Key Features
Early prediction of chronic disease progression
Explainable AI for transparency
Preventive care gap identification
Actionable insights for authorities
Scalable from individual → population level

👥 Team
Saksham Gupta
Prince Jha
Achyut Mani
Om Rai

🤝 Get Involved
We welcome contributors! Improve models, build dashboards, enhance data pipelines, or optimize performance. Fork the repo, raise issues, and submit PRs.

🧰 Tech Stack
Language: Python, JavaScript
ML: Scikit-learn, XGBoost
Data: Pandas, NumPy
Visualization: Matplotlib, Plotly
Backend: Node.js, Express
Dashboard: React
Deployment: Heroku / AWS

## Installation

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8+
- npm

### Clone the Repository
```bash
git clone https://github.com/sakshamgupta2008/Team-Ares.git
cd Team-Ares
```

### Backend Setup
```bash
cd Backend
npm install
```

### Frontend Setup
```bash
cd frontend
npm install
```

### ML Service Setup
Ensure Python dependencies are installed. Required packages include:
- Flask
- scikit-learn
- pandas
- numpy
- xgboost
- matplotlib
- plotly

Install via pip:
```bash
pip install flask scikit-learn pandas numpy xgboost matplotlib plotly
```

## Usage

### Running the Application
1. Start the ML Service:
   ```bash
   python ML/ml_service.py
   ```

2. Start the Backend:
   ```bash
   cd Backend
   npm start
   ```

3. Start the Frontend:
   ```bash
   cd frontend
   npm start
   ```

Access the application at `http://localhost:3000`.
