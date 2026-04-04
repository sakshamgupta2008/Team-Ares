/**
 * InterventionSimulator.jsx
 * 12-Week Deployment War Room
 * - Real GeoJSON map per state with district click selection
 * - Resource deployment
 * - Simulation output chart
 * 
 * TWO ML ENDPOINT HOOKS (clearly marked):
 *   1. INTERVENTION_ENDPOINT  → POST /ml/simulate  (time-series forecast)
 *   2. AI_CHATBOT_ENDPOINT    → POST /api/v1/analyze-risk  (full JSON → Gemini)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const C = {
  cyan: "#00f5ff", green: "#00ff9d", red: "#ff1a3c",
  amber: "#ffb700", purple: "#bf5fff",
  dim: "#1a3a5c", nano: "#0d2035", card: "#07111f", deep: "#030609",
};

// ── Resource types ────────────────────────────────────────────────────────
const RESOURCE_TYPES = [
  { id: "mobile", label: "Mobile Clinics",   icon: "🚐", color: C.cyan,   maxGlobal: 8,  effectiveness: 1.8 },
  { id: "asha",   label: "ASHA Groups",      icon: "👩‍⚕️", color: C.green, maxGlobal: 15, effectiveness: 1.4 },
  { id: "camp",   label: "Screening Camps",  icon: "🏕️", color: C.amber, maxGlobal: 12, effectiveness: 1.6 },
  { id: "tele",   label: "Telehealth Vans",  icon: "📡", color: C.purple, maxGlobal: 5,  effectiveness: 1.2 },
];

// ── State configs ─────────────────────────────────────────────────────────
const STATES = [
  {
    key:    "maharashtra",
    label:  "Maharashtra",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/maharashtra.geojson",
    center: [19.4, 76.5], zoom: 7,
  },
  {
    key:    "madhya-pradesh",
    label:  "Madhya Pradesh",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/madhya-pradesh.geojson",
    center: [23.5, 77.5], zoom: 6.5,
  },
  {
    key:    "karnataka",
    label:  "Karnataka",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/karnataka.geojson",
    center: [15.3, 75.7], zoom: 7,
  },
];

// ── District risk (shared baseline) ──────────────────────────────────────
const DISTRICT_RISK = {
  "pune": 42, "nagpur": 38, "thane": 51, "nashik": 44, "aurangabad": 58,
  "nanded": 62, "solapur": 55, "kolhapur": 36, "amravati": 47,
  "bhopal": 52, "indore": 44, "gwalior": 61, "jabalpur": 55, "ujjain": 60,
  "bengaluru urban": 38, "mysuru": 40, "belagavi": 58, "raichur": 73,
};
const DEFAULT_RISK = 55;

function getKey(feature) {
  const p = feature?.properties || {};
  return (p.NAME_2 || p.district || p.name || p.NAME || "").toLowerCase().trim();
}
function getLabel(feature) {
  const p = feature?.properties || {};
  return p.NAME_2 || p.district || p.name || p.NAME || "Unknown";
}

// ── MapView: handles GeoJSON + district selection ────────────────────────
function MapView({ stateKey, selectedDistrict, deployedDistricts, onDistrictClick }) {
  const stateCfg = STATES.find(s => s.key === stateKey);
  const [geoData, setGeoData] = useState(null);
  const geoRef = useRef(null);

  useEffect(() => {
    setGeoData(null);
    if (!stateCfg) return;
    fetch(stateCfg.url).then(r => r.json()).then(setGeoData).catch(console.error);
  }, [stateKey, stateCfg?.url]);

  const style = useCallback((feature) => {
    const key  = getKey(feature);
    const pct  = DISTRICT_RISK[key] ?? DEFAULT_RISK;
    const isSel = key === selectedDistrict;
    const isDep = deployedDistricts.includes(key);

    let fillColor = pct <= 40 ? "#16a34a" : pct <= 60 ? "#d97706" : "#dc2626";
    if (isSel) fillColor = "#00f5ff";

    return {
      fillColor,
      fillOpacity: isSel ? 1 : isDep ? 0.95 : 0.72,
      weight:      isSel ? 3 : isDep ? 2.5 : 0.8,
      color:       isSel ? "#00f5ff" : isDep ? "#00ff9d" : "#1e293b",
    };
  }, [selectedDistrict, deployedDistricts]);

  const onEachFeature = useCallback((feature, layer) => {
    const key   = getKey(feature);
    const label = getLabel(feature);
    layer.on({
      mouseover: () => layer.setStyle({ fillOpacity: 0.95, weight: 2 }),
      mouseout:  () => {
        if (geoRef.current) geoRef.current.resetStyle(layer);
        // Re-apply custom style after reset
        const pct = DISTRICT_RISK[key] ?? DEFAULT_RISK;
        const isSel = key === selectedDistrict;
        layer.setStyle({
          fillColor:   isSel ? "#00f5ff" : (pct <= 40 ? "#16a34a" : pct <= 60 ? "#d97706" : "#dc2626"),
          fillOpacity: isSel ? 1 : 0.72,
          weight:      isSel ? 3 : 0.8,
          color:       isSel ? "#00f5ff" : "#1e293b",
        });
      },
      click: () => onDistrictClick(key, label),
    });
  }, [selectedDistrict, onDistrictClick]);

  if (!stateCfg) return null;

  return (
    <MapContainer key={stateKey} center={stateCfg.center} zoom={stateCfg.zoom}
      style={{ height: "100%", width: "100%" }} zoomControl>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      {geoData && (
        <GeoJSON
          key={`${stateKey}-${selectedDistrict}-${deployedDistricts.join(",")}`}
          ref={geoRef}
          data={geoData}
          style={style}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
}

// ── Custom Tooltip for chart ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#030609", border: "1px solid #0d2035",
      borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: "#4a7090", marginBottom: 6 }}>Week {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ fontSize: 12, fontWeight: 700,
          color: p.color, fontFamily: "'JetBrains Mono',monospace" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          {p.dataKey === "risk" || p.dataKey === "baseline" ? "%" : ""}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
const InterventionSimulator = ({ onBack }) => {
  const [selectedState,    setSelectedState]    = useState("maharashtra");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtLabel,    setDistrictLabel]    = useState("");
  const [resources,        setResources]        = useState({ mobile: 0, asha: 0, camp: 0, tele: 0 });
  const [simResult,        setSimResult]        = useState(null);
  const [simRunning,       setSimRunning]       = useState(false);
  const [currentWeek,      setCurrentWeek]      = useState(1);
  const [playing,          setPlaying]          = useState(false);
  const playRef = useRef(null);

  const totalRes      = Object.values(resources).reduce((a, b) => a + b, 0);
  const baselineRisk  = DISTRICT_RISK[selectedDistrict] ?? DEFAULT_RISK;
  const weekData      = simResult?.weeks?.[currentWeek - 1] ?? null;

  // Playback
  useEffect(() => {
    if (playing && simResult) {
      playRef.current = setInterval(() => {
        setCurrentWeek(prev => {
          if (prev >= 12) { setPlaying(false); return 12; }
          return prev + 1;
        });
      }, 500);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [playing, simResult]);

  // District click
  const handleDistrictClick = useCallback((key, label) => {
    setSelectedDistrict(key);
    setDistrictLabel(label);
    setSimResult(null);
    setCurrentWeek(1);
  }, []);

  // ── INTERVENTION ENDPOINT (Flow 1) ────────────────────────────────────
  // Replace the setTimeout block below with:
  //   const res = await fetch("YOUR_INTERVENTION_ENDPOINT/ml/simulate", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ state: selectedState, district: selectedDistrict, resources })
  //   });
  //   const data = await res.json();
  //   setSimResult(data);  // expect { weeks: [{week, risk, gap, screened}], metrics: {...} }
  const runSimulation = useCallback(() => {
    if (!selectedDistrict) return;
    setSimRunning(true);
    setCurrentWeek(1);

    const totalEffect = Object.keys(resources).reduce((sum, key) => {
      const res = RESOURCE_TYPES.find(r => r.id === key);
      return sum + (resources[key] * (res?.effectiveness || 1));
    }, 0);

    // Dummy simulation — replace with real endpoint call above
    setTimeout(() => {
      const weeks = Array.from({ length: 12 }, (_, i) => ({
        week:      i + 1,
        baseline:  baselineRisk,
        risk:      Math.max(18, baselineRisk - totalEffect * 2.2 * (i + 1) / 12),
        gap:       Math.max(5, 76 - totalEffect * 3 * (i + 1) / 12),
        screened:  Math.floor(1200 + totalEffect * 180 * (i + 1) / 12),
      }));
      setSimResult({
        weeks,
        metrics: {
          finalRisk:     Math.max(18, baselineRisk - totalEffect * 2.2),
          riskReduction: Math.min(baselineRisk - 18, totalEffect * 2.2).toFixed(1),
          livesImpacted: Math.floor(totalEffect * 1200),
          gapClosed:     Math.min(76, totalEffect * 3).toFixed(1),
        },
      });
      setSimRunning(false);
      setPlaying(true);
    }, 1200);
  }, [selectedDistrict, resources, baselineRisk]);

  const deployedDistricts = simResult ? [selectedDistrict] : [];

  return (
    <div style={S.root}>
      {/* Top Bar */}
      <div style={S.topBar}>
        <button onClick={onBack} style={S.backBtn}>← Back</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#e8f4ff", letterSpacing: "0.06em" }}>
            12-WEEK DEPLOYMENT <span style={{ color: C.cyan }}>WAR ROOM</span>
          </div>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>
            DIGITAL TWIN · PREDICTIVE SIMULATION
          </div>
        </div>

        {/* State selector */}
        <div style={{ display: "flex", gap: 8, marginLeft: 24 }}>
          {STATES.map(s => (
            <button key={s.key} onClick={() => {
              setSelectedState(s.key);
              setSelectedDistrict(null);
              setSimResult(null);
            }} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              background: selectedState === s.key ? "rgba(0,245,255,0.12)" : "transparent",
              border:     selectedState === s.key ? "1px solid #00f5ff" : "1px solid #0d2035",
              color:      selectedState === s.key ? "#00f5ff" : "#4a7090",
            }}>{s.label}</button>
          ))}
        </div>

        {/* Impact score (after sim) */}
        {simResult && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {[
              { l: "Risk Reduction", v: `−${simResult.metrics.riskReduction}%`, c: C.green },
              { l: "Lives Impacted",  v: simResult.metrics.livesImpacted.toLocaleString(), c: C.cyan },
              { l: "Gap Closed",     v: `${simResult.metrics.gapClosed}%`, c: C.amber },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ textAlign: "center", background: C.card,
                border: `1px solid ${c}22`, borderRadius: 8, padding: "6px 14px" }}>
                <div style={{ fontSize: 9, color: C.dim }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: c,
                  fontFamily: "'JetBrains Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Left — Resources */}
        <aside style={S.leftSidebar}>
          <div style={S.sideLabel}>RESOURCE POOL · {totalRes} DEPLOYED</div>

          {RESOURCE_TYPES.map(res => (
            <div key={res.id} style={{
              background: C.card,
              border: `1px solid ${resources[res.id] > 0 ? res.color + "33" : C.nano}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 8,
              transition: "border-color 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{res.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: res.color }}>{res.label}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>Max {res.maxGlobal}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setResources(p => ({ ...p, [res.id]: Math.max(0, p[res.id]-1) }))}
                    style={{ width: 28, height: 28, borderRadius: 6, background: C.nano,
                      color: C.dim, border: "none", cursor: "pointer", fontSize: 16 }}>−</button>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16,
                    fontWeight: 800, color: res.color, minWidth: 24, textAlign: "center" }}>
                    {resources[res.id]}
                  </span>
                  <button onClick={() => setResources(p => ({ ...p, [res.id]: Math.min(res.maxGlobal, p[res.id]+1) }))}
                    style={{ width: 28, height: 28, borderRadius: 6, background: C.nano,
                      color: res.color, border: "none", cursor: "pointer", fontSize: 16 }}>+</button>
                </div>
              </div>
            </div>
          ))}

          {/* District selection info */}
          <div style={{ padding: "10px 12px", background: C.nano, borderRadius: 8, marginBottom: 8 }}>
            {selectedDistrict ? (
              <>
                <div style={{ fontSize: 9, color: C.dim }}>SELECTED DISTRICT</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, marginTop: 2 }}>
                  {districtLabel}
                </div>
                <div style={{ fontSize: 10, color: "#4a7090", marginTop: 2 }}>
                  Baseline risk: <span style={{ color: baselineRisk > 60 ? C.red : baselineRisk > 40 ? C.amber : C.green }}>
                    {baselineRisk}%
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 10, color: C.dim, textAlign: "center", padding: "4px 0" }}>
                ← Click a district on the map
              </div>
            )}
          </div>

          <button
            onClick={runSimulation}
            disabled={simRunning || !selectedDistrict || totalRes === 0}
            style={{
              width: "100%", padding: "13px", borderRadius: 10,
              background: (simRunning || !selectedDistrict || totalRes === 0)
                ? "transparent" : "rgba(0,245,255,0.1)",
              border: `1px solid ${(simRunning || !selectedDistrict || totalRes === 0) ? C.nano : C.cyan}`,
              color: (simRunning || !selectedDistrict || totalRes === 0) ? "#4a7090" : C.cyan,
              fontWeight: 800, fontSize: 12, letterSpacing: "0.08em",
              cursor: (simRunning || !selectedDistrict || totalRes === 0) ? "not-allowed" : "pointer",
              fontFamily: "'JetBrains Mono',monospace",
              transition: "all 0.2s",
            }}>
            {simRunning ? "● SIMULATING..." : "▶ RUN 12-WEEK SIM"}
          </button>
        </aside>

        {/* Center — Map */}
        <div style={S.center}>
          <MapView
            stateKey={selectedState}
            selectedDistrict={selectedDistrict}
            deployedDistricts={deployedDistricts}
            onDistrictClick={handleDistrictClick}
          />
          {!selectedDistrict && (
            <div style={{
              position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
              background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.25)",
              borderRadius: 8, padding: "8px 18px", zIndex: 800,
              fontSize: 11, color: "#4a7090", fontFamily: "'JetBrains Mono',monospace",
              pointerEvents: "none",
            }}>
              ◉ Click a district to select it for simulation
            </div>
          )}
        </div>

        {/* Right — Simulation output */}
        <aside style={S.rightPanel}>
          <div style={S.sideLabel}>SIMULATION OUTPUT</div>

          {!simResult ? (
            <div style={{ textAlign: "center", color: C.dim, padding: "60px 20px", fontSize: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>◈</div>
              Deploy resources and run simulation
            </div>
          ) : (
            <>
              {/* Week slider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <button onClick={() => setPlaying(p => !p)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "1px solid #0d2035",
                  background: playing ? "rgba(0,245,255,0.1)" : "transparent",
                  color: playing ? C.cyan : "#4a7090", fontWeight: 700, cursor: "pointer",
                  fontSize: 11,
                }}>
                  {playing ? "⏸" : "▶"}
                </button>
                <input
                  type="range" min={1} max={12} value={currentWeek}
                  onChange={e => { setCurrentWeek(+e.target.value); setPlaying(false); }}
                  style={{ flex: 1, accentColor: C.cyan }}
                />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                  color: C.cyan, minWidth: 30 }}>W{currentWeek}</span>
              </div>

              {/* Current week stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: C.card, padding: "12px", borderRadius: 10,
                  border: "1px solid #0d2035" }}>
                  <div style={{ fontSize: 9, color: C.dim }}>CURRENT RISK</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: C.red,
                    fontFamily: "'JetBrains Mono',monospace" }}>
                    {weekData?.risk?.toFixed(1) ?? "--"}%
                  </div>
                </div>
                <div style={{ background: C.card, padding: "12px", borderRadius: 10,
                  border: "1px solid #0d2035" }}>
                  <div style={{ fontSize: 9, color: C.dim }}>SCREENED</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: C.green,
                    fontFamily: "'JetBrains Mono',monospace" }}>
                    {weekData?.screened?.toLocaleString() ?? "--"}
                  </div>
                </div>
              </div>

              {/* Risk trend chart */}
              <div style={{ fontSize: 9, color: C.dim, marginBottom: 6, letterSpacing: "0.1em" }}>
                RISK SCORE TREND (12 WEEKS)
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={simResult.weeks} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.red}  stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.red}  stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4a7090" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4a7090" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0d2035" />
                  <XAxis dataKey="week" tick={{ fill: "#1a3a5c", fontSize: 9 }}
                    tickFormatter={v => `W${v}`} />
                  <YAxis tick={{ fill: "#1a3a5c", fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="baseline" name="Baseline"
                    stroke="#4a7090" strokeDasharray="4 2" strokeWidth={1}
                    fill="url(#baseGrad)" dot={false} />
                  <Area type="monotone" dataKey="risk" name="Projected Risk"
                    stroke={C.red} strokeWidth={2}
                    fill="url(#riskGrad)" dot={false} />
                  {/* Current week marker line */}
                  {weekData && (
                    <Area type="monotone" dataKey={d => d.week === currentWeek ? d.risk : undefined}
                      dot={{ r: 5, fill: C.cyan, strokeWidth: 0 }} activeDot={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>

              {/* Screened chart */}
              <div style={{ fontSize: 9, color: C.dim, marginBottom: 6, marginTop: 12,
                letterSpacing: "0.1em" }}>
                SCREENINGS COMPLETED
              </div>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={simResult.weeks} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.cyan} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0d2035" />
                  <XAxis dataKey="week" tick={{ fill: "#1a3a5c", fontSize: 9 }}
                    tickFormatter={v => `W${v}`} />
                  <YAxis tick={{ fill: "#1a3a5c", fontSize: 9 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="screened" name="Screened"
                    stroke={C.cyan} strokeWidth={2} fill="url(#screenGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>

              {/* ── AI CHATBOT ENDPOINT NOTE (Flow 2) ─────────────────── */}
              {/* To trigger AI analysis on this district, call:           */}
              {/* POST /api/v1/analyze-risk with:                          */}
              {/*   { state: selectedState, district: districtLabel,       */}
              {/*     patient_features: { ...district_health_data } }      */}
              {/* Pass the returned JSON to aiService.js → getInitialReasoning() */}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  root: {
    height: "100vh", width: "100vw", background: "#000",
    display: "flex", flexDirection: "column", overflow: "hidden",
    fontFamily: "'Syne', sans-serif",
  },
  topBar: {
    padding: "10px 20px", borderBottom: "1px solid #0d2035",
    background: "linear-gradient(to right, #000, #030609)",
    display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
  },
  backBtn: {
    background: "transparent", border: "1px solid #0d2035",
    color: "#4a7090", padding: "6px 14px", borderRadius: 8,
    fontSize: 11, fontWeight: 700, cursor: "pointer",
  },
  body: { flex: 1, display: "flex", overflow: "hidden" },
  leftSidebar: {
    width: 280, background: C.deep, borderRight: "1px solid #0d2035",
    padding: "16px 14px", display: "flex", flexDirection: "column",
    gap: 0, overflowY: "auto",
  },
  center: { flex: 1, position: "relative" },
  rightPanel: {
    width: 340, background: C.deep, borderLeft: "1px solid #0d2035",
    padding: "16px 14px", overflowY: "auto",
  },
  sideLabel: {
    fontSize: 9, color: "#1a3a5c", letterSpacing: "0.12em",
    marginBottom: 12, fontFamily: "'JetBrains Mono',monospace",
  },
};

export default InterventionSimulator;
