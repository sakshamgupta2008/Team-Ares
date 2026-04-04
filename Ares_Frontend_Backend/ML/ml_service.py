"""
PreventiQ ML Microservice — Flask REST API
Run:  python ml_service.py          (from backend dir)
Port: 5001
Needs: final_health_data.xlsx in same directory
"""

import os, sys, warnings
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, make_response
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.ensemble import RandomForestClassifier
from scipy import stats

warnings.filterwarnings("ignore")
app = Flask(__name__)

# Manual CORS so we don't need flask-cors
@app.after_request
def add_cors(r):
    r.headers["Access-Control-Allow-Origin"]  = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type"
    r.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return r

@app.route("/", defaults={"path":""}, methods=["OPTIONS"])
@app.route("/<path:path>",             methods=["OPTIONS"])
def preflight(path): return make_response("", 200)

# ─────────────────────────────────────────────────────────────────
class PreventiQML:
    SCALE_COLS = [
        "age","household_size","chronic_disease","hypertension","diabetes",
        "asthma","missed_visits_12m","missed_screenings_12m",
        "days_since_last_visit","followup_delay_days","screening_completed",
        "vaccination_up_to_date","facility_access_km","region_health_index",
    ]
    LABELS = {
        "age":"Patient Age","chronic_disease":"Chronic Disease Burden",
        "hypertension":"Hypertension Prevalence","diabetes":"Diabetes Prevalence",
        "missed_visits_12m":"Missed Visits (12m)","missed_screenings_12m":"Missed Screenings (12m)",
        "days_since_last_visit":"Days Since Last Visit","followup_delay_days":"Follow-up Delay (Days)",
        "screening_completed":"Screening Completion","vaccination_up_to_date":"Vaccination Coverage",
        "facility_access_km":"Facility Distance (km)","region_health_index":"Region Health Index",
        "obesity":"Obesity Rate","household_size":"Household Size",
    }

    def __init__(self, path):
        self.df = self.df_s = self.scaler = None
        self.sig = []; self.model = None; self.acc = 0.0
        self.fimp = {}; self.ttest = None
        self.state_cache = {}; self.district_cache = {}
        self._run(path)

    def _run(self, path):
        print(f"[ML] Loading {path}")
        self.df = pd.read_excel(path)
        print(f"[ML] {len(self.df)} rows")
        self._scale(); self._stats(); self._train(); self._cache()
        print("[ML] Ready")

    def _scale(self):
        cols = [c for c in self.SCALE_COLS if c in self.df.columns]
        self.scaler = StandardScaler()
        self.df_s = self.df.copy()
        self.df_s[cols] = self.scaler.fit_transform(self.df[cols])

    def _stats(self):
        tgt = self.df_s["ill"]
        feats = [c for c in self.df_s.select_dtypes(include=[np.number]).columns if c!="ill"]
        rows = []
        for f in feats:
            g1=self.df_s[tgt==1][f].dropna(); g0=self.df_s[tgt==0][f].dropna()
            t,p = stats.ttest_ind(g1,g0)
            d   = (g1.mean()-g0.mean())/max(np.sqrt((g1.std()**2+g0.std()**2)/2),1e-9)
            rows.append({"f":f,"p":p,"d":d})
        self.ttest = pd.DataFrame(rows)
        self.sig = self.ttest[self.ttest.p<0.05]["f"].tolist()
        print(f"[ML] {len(self.sig)} significant features")

    def _train(self):
        X = self.df_s[self.sig].fillna(self.df_s[self.sig].mean())
        y = self.df_s["ill"]
        Xtr,Xte,ytr,yte = train_test_split(X,y,test_size=0.2,random_state=42,stratify=y)
        clf = RandomForestClassifier(n_estimators=150,max_depth=12,random_state=42,n_jobs=-1)
        clf.fit(Xtr,ytr)
        self.model = clf
        self.acc   = float(accuracy_score(yte,clf.predict(Xte)))
        self.fimp  = dict(zip(self.sig, clf.feature_importances_.tolist()))
        print(f"[ML] Accuracy: {self.acc:.4f}")

    def _lvl(self, pct): return "high" if pct>65 else "medium" if pct>45 else "low"
    def _conf(self, std): return "high" if std<0.10 else "medium" if std<0.18 else "low"

    def _top_feats(self, n=7):
        sf = sorted(self.fimp.items(), key=lambda x:x[1], reverse=True)[:n]
        out = []
        for feat,imp in sf:
            row = self.ttest[self.ttest.f==feat]
            d   = float(row.iloc[0].d) if len(row) else 0
            p   = float(row.iloc[0].p) if len(row) else 1
            out.append({
                "feature":    feat,
                "label":      self.LABELS.get(feat, feat.replace("_"," ").title()),
                "importance": round(imp*100, 2),
                "cohens_d":   round(d, 3),
                "direction":  "risk-increasing" if d>0 else "risk-reducing",
                "p_value":    round(p, 5),
            })
        return out

    def _predict(self, X):
        X = X.fillna(X.mean())
        p = self.model.predict_proba(X)[:,1]
        pct = round(float(p.mean())*100, 2)
        return {
            "risk_pct":   pct,
            "risk_level": self._lvl(pct),
            "confidence": self._conf(float(p.std())),
            "std":        round(float(p.std()),4),
            "min_pct":    round(float(p.min())*100,2),
            "max_pct":    round(float(p.max())*100,2),
            "sample_n":   len(X),
        }

    def _cache(self):
        for st in self.df.state_or_ut.unique():
            sd = self.df_s[self.df_s.state_or_ut==st]
            r  = self._predict(sd[self.sig])
            self.state_cache[st.lower()] = {
                **r,"state":st,
                "top_features": self._top_feats(),
                "model_accuracy": round(self.acc*100,2),
            }
            for dist in self.df[self.df.state_or_ut==st].district_name.unique():
                idx = self.df[(self.df.state_or_ut==st)&(self.df.district_name==dist)].index
                Xd  = self.df_s.loc[idx][self.sig]
                rd  = self._predict(Xd)
                key = dist.lower().strip()
                self.district_cache[key] = {
                    **rd,"district":dist,"state":st,
                    "top_features":   self._top_feats(),
                    "model_accuracy": round(self.acc*100,2),
                    "ml_backed":      True,
                }
        print(f"[ML] Cached: {len(self.state_cache)} states, {len(self.district_cache)} districts")

    def district(self, k): return self.district_cache.get(k.lower().strip())
    def state(self, k):    return self.state_cache.get(k.lower().strip())
    def districts(self, st=None):
        data = list(self.district_cache.values())
        if st: data=[d for d in data if d.get("state","").lower()==st.lower()]
        return data
    def states(self): return list(self.state_cache.values())

# ── Boot ──────────────────────────────────────────────────────────
DATA = os.environ.get("HEALTH_DATA","final_health_data.xlsx")
print(f"\n{'='*50}\n  PreventiQ ML Service\n{'='*50}")
ML = PreventiQML(DATA)

# ── Routes ────────────────────────────────────────────────────────
@app.route("/ml/health")
def r_health():
    return jsonify({"status":"ok","accuracy_pct":round(ML.acc*100,2),
                    "districts":len(ML.district_cache),"states":len(ML.state_cache)})

@app.route("/ml/features")
def r_features():
    return jsonify(ML._top_feats(10))

@app.route("/ml/district/<name>")
def r_district(name):
    d = ML.district(name)
    if not d: return jsonify({"error":f"'{name}' not in ML dataset","ml_backed":False}),404
    return jsonify(d)

@app.route("/ml/state/<name>")
def r_state(name):
    s = ML.state(name)
    if not s: return jsonify({"error":f"State '{name}' not found"}),404
    return jsonify(s)

@app.route("/ml/districts")
def r_districts():
    return jsonify(ML.districts(request.args.get("state")))

@app.route("/ml/states")
def r_states():
    return jsonify(ML.states())

if __name__ == "__main__":
    print(f"\n[ML] → http://localhost:5001\n")
    app.run(port=5001,debug=False,threaded=True)
