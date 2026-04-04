import express  from "express";
import cors     from "cors";
import http     from "http";
import { maharashtraDistrictData, karnatakaDistrictData, mpDistrictData } from "./data.js";
import { calculateRisk }           from "./risk.js";
import { districtDiseaseData }     from "./districtDiseaseData.js";
import { indiaStateData }          from "./indiaStateData.js";

const app  = express();
const PORT = 5000;
const ML_PORT = 5001;
const ML_HOST = "127.0.0.1";

app.use(cors({ origin: "*" }));
app.use(express.json());

const allDistrictsData = [
  ...maharashtraDistrictData.map(d => ({ ...d, state: "Maharashtra" })),
  ...karnatakaDistrictData.map(d => ({ ...d, state: "Karnataka" })),
  ...mpDistrictData.map(d => ({ ...d, state: "Madhya Pradesh" })),
];

// ── Utility: call the Python ML microservice ─────────────────────
function callML(path) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: ML_HOST, port: ML_PORT, path },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end",  ()  => {
          try   { resolve({ ok: true,  data: JSON.parse(raw) }); }
          catch { resolve({ ok: false, data: null }); }
        });
      }
    );
    req.on("error", () => resolve({ ok: false, data: null }));
    req.setTimeout(4000, () => { req.destroy(); resolve({ ok: false, data: null }); });
  });
}

// ── GET /ml/status ───────────────────────────────────────────────
// Frontend can check if the ML service is alive.
app.get("/ml/status", async (req, res) => {
  const r = await callML("/ml/health");
  res.json(r.ok ? { ...r.data, online: true } : { online: false });
});

// ── GET /districts ───────────────────────────────────────────────
app.get("/districts", async (req, res) => {
  const state = req.query.state;
  let districtsToProcess = allDistrictsData;
  
  if (state) {
    districtsToProcess = allDistrictsData.filter(d => d.state.toLowerCase() === state.toLowerCase());
  }

  // Try to enrich with ML risk_pct for the districts the model knows (only for Maharashtra for now)
  const mlRes = await callML(`/ml/districts?state=${state || "Maharashtra"}`);
  const mlMap = {};
  if (mlRes.ok && Array.isArray(mlRes.data)) {
    mlRes.data.forEach((d) => { mlMap[d.district.toLowerCase().trim()] = d; });
  }

  const data = districtsToProcess.map((item) => {
    const { gap, score, level, trend } = calculateRisk(
      item.expected_check_percent,
      item.actual_check_percent
    );
    const key   = item.district.toLowerCase().trim();
    const ml    = mlMap[key] || null;
    return {
      district:  item.district,
      state:     item.state,
      expected:  item.expected_check_percent,
      actual:    item.actual_check_percent,
      gap, score, risk: level, trend,
      // ML fields (null for districts not in model)
      ml_risk_pct:  ml ? ml.risk_pct   : null,
      ml_risk:      ml ? ml.risk_level : null,
      ml_backed:    !!ml,
      ml_sample_n:  ml ? ml.sample_n   : null,
    };
  });
  res.json(data);
});

// ── GET /compare ─────────────────────────────────────────────────
app.get("/compare", (req, res) => {
  const { districts } = req.query;
  if (!districts) return res.status(400).json({ error: "Districts parameter required" });

  const districtList = districts.split(",").map(d => d.toLowerCase().trim());
  const results = districtList.map(name => {
    const data = districtDiseaseData[name];
    if (!data) return null;

    // Calculate overall risk for summary
    const districtInfo = allDistrictsData.find(d => d.district.toLowerCase() === name);
    const riskInfo = districtInfo ? calculateRisk(districtInfo.expected_check_percent, districtInfo.actual_check_percent) : null;

    return {
      ...data,
      ...riskInfo
    };
  }).filter(Boolean);

  res.json(results);
});


// ── GET /summary ─────────────────────────────────────────────────
app.get("/summary", async (req, res) => {
  const enriched = maharashtraDistrictData.map((item) => {
    const { gap, score, level } = calculateRisk(
      item.expected_check_percent, item.actual_check_percent
    );
    return { ...item, gap, score, risk: level };
  });
  const total  = enriched.length;
  const high   = enriched.filter((d) => d.risk === "high").length;
  const medium = enriched.filter((d) => d.risk === "medium").length;
  const low    = enriched.filter((d) => d.risk === "low").length;
  const avgGap = (enriched.reduce((s, d) => s + d.gap, 0) / total).toFixed(1);
  const worst  = [...enriched].sort((a, b) => b.gap - a.gap)[0];

  // ML service accuracy badge
  const mlStatus = await callML("/ml/health");
  res.json({
    total, high, medium, low, avgGap,
    worstDistrict: worst.district,
    worstGap:      worst.gap,
    ml_accuracy:   mlStatus.ok ? mlStatus.data.accuracy_pct : null,
    ml_online:     mlStatus.ok,
  });
});

// ── GET /district/:name ──────────────────────────────────────────
// Returns disease history/prediction AND ML insights (if available).
app.get("/district/:name", async (req, res) => {
  const key  = req.params.name.toLowerCase().trim();
  const base = maharashtraDistrictData.find(
    (d) => d.district.toLowerCase().trim() === key
  );

  let simData = districtDiseaseData[key] || null;
  let riskData = {};
  if (base) {
    const { gap, score, level, trend } = calculateRisk(
      base.expected_check_percent, base.actual_check_percent
    );
    riskData = {
      expected: base.expected_check_percent,
      actual:   base.actual_check_percent,
      gap, score, risk: level, trend,
    };
  }

  if (!simData && !base) {
    return res.status(404).json({ error: "District not found", key });
  }

  // Call ML service
  const mlRes = await callML(`/ml/district/${encodeURIComponent(key)}`);
  const mlData = mlRes.ok ? mlRes.data : null;

  res.json({
    ...(simData || {}),
    ...riskData,
    ml: mlData,           // null if district not in ML model
  });
});

// ── GET /india/states ────────────────────────────────────────────
app.get("/india/states", async (req, res) => {
  // Enhance with real ML risk_pct where available
  const mlRes = await callML("/ml/states");
  const mlMap = {};
  if (mlRes.ok && Array.isArray(mlRes.data)) {
    mlRes.data.forEach((s) => { mlMap[s.state.toLowerCase()] = s; });
  }
  const enhanced = indiaStateData.map((s) => {
    const ml = mlMap[s.state.toLowerCase()];
    return { ...s, ml_risk_pct: ml ? ml.risk_pct : null, ml_backed: !!ml };
  });
  res.json(enhanced);
});

// ── GET /ml/district/:name — direct ML proxy ─────────────────────
app.get("/ml/district/:name", async (req, res) => {
  const r = await callML(`/ml/district/${encodeURIComponent(req.params.name)}`);
  if (!r.ok) return res.status(404).json({ error: "ML data unavailable", ml_backed: false });
  res.json(r.data);
});

app.listen(PORT, () => {
  console.log(`\n✅  Backend       → http://localhost:${PORT}`);
  console.log(`   /districts       — Maharashtra districts (+ ML enrichment)`);
  console.log(`   /summary         — Aggregate stats + ML accuracy`);
  console.log(`   /district/:name  — District detail + ML insights`);
  console.log(`   /india/states    — India state risk`);
  console.log(`   /ml/status       — ML service health\n`);
  console.log(`   (Start ML service: python ml_service.py)`);
});
