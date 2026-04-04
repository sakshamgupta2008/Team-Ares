/**
 * InterventionSimulator.jsx
 * Mission Control – 12-Week Deployment War Room
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

const C = {
  cyan:   "#00f5ff",
  green:  "#00ff9d",
  red:    "#ff1a3c",
  amber:  "#ffb700",
  purple: "#bf5fff",
  dim:    "#1a3a5c",
  nano:   "#0d2035",
  card:   "#07111f",
  panel:  "#060d18",
  deep:   "#030609",
};

const RESOURCE_TYPES = [
  { id: "mobile", label: "Mobile Clinics", icon: "🚐", color: C.cyan, maxGlobal: 8, effectiveness: 1.8 },
  { id: "asha",   label: "ASHA Groups",    icon: "👩‍⚕️", color: C.green, maxGlobal: 15, effectiveness: 1.4 },
  { id: "camp",   label: "Screening Camps", icon: "🏕️", color: C.amber, maxGlobal: 12, effectiveness: 1.6 },
  { id: "tele",   label: "Telehealth Vans", icon: "📡", color: C.purple, maxGlobal: 5, effectiveness: 1.2 },
];

const STATES = [
  {
    key: "maharashtra",
    label: "Maharashtra",
    url: "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/maharashtra.geojson",
    center: [19.4, 76.5],
    zoom: 7,
  },
  {
    key: "madhya-pradesh",
    label: "Madhya Pradesh",
    url: "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/madhya-pradesh.geojson",
    center: [23.5, 77.5],
    zoom: 6.5,
  },
  {
    key: "karnataka",
    label: "Karnataka",
    url: "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/karnataka.geojson",
    center: [15.3, 75.7],
    zoom: 7,
  },
];

const DUMMY_DISTRICT_RISK = {
  "pune": 42, "nagpur": 38, "thane": 51, "nashik": 44, "aurangabad": 58,
  "nanded": 62, "solapur": 55, "kolhapur": 36, "amravati": 47,
  "bhopal": 52, "indore": 44, "gwalior": 61, "bengaluru urban": 38,
};

function riskToColor(pct) {
  if (pct <= 45)  return `hsl(142, 70%, ${75 - (pct - 20) * 0.8}%)`;
  if (pct <= 65)  return `hsl(36, 90%, ${68 - (pct - 45) * 1.1}%)`;
  return `hsl(0, 85%, ${58 - (pct - 65) * 0.9}%)`;
}

function getFeatureName(feature) {
  const p = feature?.properties || {};
  return p.NAME_2 || p.NAME_1 || p.district || p.name || p.NAME || "";
}

// Main Component
const InterventionSimulator = ({ onBack }) => {
  // ── ALL HOOKS MUST BE AT THE TOP ───────────────────────────────────────
  const [mode, setMode] = useState("manual");
  const [selectedState, setSelectedState] = useState("maharashtra");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);

  const [resources, setResources] = useState({
    mobile: 0, asha: 0, camp: 0, tele: 0,
  });

  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [deployments, setDeployments] = useState({});

  const playRef = useRef(null);

  // Derived values
  const totalRes = Object.values(resources).reduce((a, b) => a + b, 0);
  const weekData = simResult?.weeks?.[currentWeek - 1] || null;
  const baselineRisk = selectedDistrict ? DUMMY_DISTRICT_RISK[selectedDistrict] || 55 : 55;

  // Playback effect
  useEffect(() => {
    if (playing && simResult) {
      playRef.current = setInterval(() => {
        setCurrentWeek((prev) => {
          if (prev >= 12) {
            setPlaying(false);
            return 12;
          }
          return prev + 1;
        });
      }, 650);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [playing, simResult]);

  // Run Simulation (Dummy until real ML /ml/simulate is connected)
  const runSimulation = useCallback(() => {
    if (!selectedDistrict) return;

    setSimRunning(true);
    setCurrentWeek(1);

    const totalEffect = Object.keys(resources).reduce((sum, key) => {
      const res = RESOURCE_TYPES.find(r => r.id === key);
      return sum + (resources[key] * (res?.effectiveness || 1));
    }, 0);

    setDeployments({ [selectedDistrict]: { effect: totalEffect } });

    setTimeout(() => {
      const weeks = Array.from({ length: 12 }, (_, i) => ({
        week: i + 1,
        risk: Math.max(20, baselineRisk - totalEffect * 2.2 * (i + 1) / 12),
        gap: Math.max(5, 76 - totalEffect * 3 * (i + 1) / 12),
        screened: Math.floor(1200 + totalEffect * 180 * (i + 1) / 12),
      }));

      setSimResult({
        weeks,
        metrics: {
          gapClosed: 28.4,
          livesImpacted: 12400,
          equityGain: 19,
          costPerLife: 1840,
        },
      });

      setSimRunning(false);
      setPlaying(true);
    }, 1400);
  }, [selectedDistrict, resources, baselineRisk]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>

      {/* Top Bar */}
      <div style={S.topBar}>
        <button onClick={onBack} style={S.backBtn}>← Back</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#e8f4ff", letterSpacing: "0.06em" }}>
            12-WEEK DEPLOYMENT <span style={{ color: C.cyan }}>WAR ROOM</span>
          </div>
          <div style={{ fontSize: 9, color: C.dim }}>DIGITAL TWIN • PREDICTIVE SIMULATION</div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["manual", "ai", "scenario"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                background: mode === m ? "rgba(0,245,255,0.12)" : "transparent",
                border: mode === m ? "1px solid #00f5ff" : "1px solid #0d2035",
                color: mode === m ? "#00f5ff" : "#4a7090",
              }}
            >
              {m === "ai" ? "AI Commander" : m === "manual" ? "Manual" : "Scenarios"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div style={S.body}>

        {/* Left Sidebar - Resources */}
        <aside style={S.leftSidebar}>
          <div style={S.sidebarHeader}>
            RESOURCE POOL • {totalRes} UNITS DEPLOYED
          </div>

          {RESOURCE_TYPES.map((res) => (
            <div key={res.id} style={{
              background: C.card,
              border: `1px solid ${resources[res.id] > 0 ? res.color + "33" : C.nano}`,
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{res.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: res.color }}>{res.label}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>Max {res.maxGlobal}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setResources(p => ({ ...p, [res.id]: Math.max(0, p[res.id] - 1) }))}
                    style={{ width: 28, height: 28, borderRadius: 6, background: C.nano, color: C.dim }}
                  >−</button>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, color: res.color, minWidth: 24, textAlign: "center" }}>
                    {resources[res.id]}
                  </span>
                  <button
                    onClick={() => setResources(p => ({ ...p, [res.id]: Math.min(res.maxGlobal, p[res.id] + 1) }))}
                    style={{ width: 28, height: 28, borderRadius: 6, background: C.nano, color: res.color }}
                  >+</button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={runSimulation}
            disabled={simRunning || !selectedDistrict}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "auto",
              borderRadius: 10,
              background: simRunning ? "#1a3a5c" : "#00f5ff22",
              border: `1px solid ${simRunning ? "#1a3a5c" : "#00f5ff"}`,
              color: simRunning ? "#4a7090" : "#00f5ff",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.08em",
              cursor: simRunning || !selectedDistrict ? "not-allowed" : "pointer",
            }}
          >
            {simRunning ? "SIMULATING..." : "▶ RUN 12-WEEK SIMULATION"}
          </button>
        </aside>

        {/* Center - Map */}
        <div style={S.center}>
          <MapContainer center={[19.4, 76.5]} zoom={7} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          </MapContainer>

          {selectedDistrict && (
            <div style={S.mapTooltip}>
              {selectedDistrict.toUpperCase()} — Baseline Risk: <span style={{ color: C.red }}>{baselineRisk}%</span>
            </div>
          )}
        </div>

        {/* Right Panel - Metrics */}
        <aside style={S.rightPanel}>
          <div style={S.sidebarHeader}>LIVE SIMULATION METRICS</div>

          {!simResult ? (
            <div style={S.idleState}>
              Select a district and deploy resources to run simulation
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: C.cyan, marginBottom: 12 }}>
                WEEK {currentWeek} / 12
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#07111f", padding: 16, borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: "#4a7090" }}>CURRENT RISK</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.red }}>
                    {weekData?.risk?.toFixed(1) || "--"}%
                  </div>
                </div>
                <div style={{ background: "#07111f", padding: 16, borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: "#4a7090" }}>GAP CLOSED</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.green }}>28.4%</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

// Styles
const S = {
  root: {
    height: "100vh",
    width: "100vw",
    background: "#000",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "'Syne', sans-serif",
  },
  topBar: {
    padding: "12px 24px",
    borderBottom: "1px solid #0d2035",
    background: "linear-gradient(to right, #000, #030609)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexShrink: 0,
  },
  backBtn: {
    background: "transparent",
    border: "1px solid #0d2035",
    color: "#4a7090",
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  leftSidebar: {
    width: 290,
    background: "#030609",
    borderRight: "1px solid #0d2035",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  center: {
    flex: 1,
    position: "relative",
  },
  rightPanel: {
    width: 340,
    background: "#030609",
    borderLeft: "1px solid #0d2035",
    padding: "20px 16px",
    overflowY: "auto",
  },
  sidebarHeader: {
    fontSize: 9,
    color: "#1a3a5c",
    letterSpacing: "0.12em",
    marginBottom: 12,
  },
  mapTooltip: {
    position: "absolute",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(7,17,31,0.95)",
    border: "1px solid #00f5ff33",
    borderRadius: 12,
    padding: "12px 20px",
    zIndex: 1000,
  },
  idleState: {
    textAlign: "center",
    color: "#1a3a5c",
    padding: "80px 20px",
  },
};

export default InterventionSimulator;
