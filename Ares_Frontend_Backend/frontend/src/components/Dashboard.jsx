/**
 * Dashboard.jsx — Main app shell.
 *
 * • Country view: IndiaMap
 * • State view:   StateDistrictMap (ALL 3 states — unified)
 * • Modal:        DistrictOverlay (handled inside StateDistrictMap)
 * • Simulator:    InterventionSimulator
 */
import React, { useState, useCallback } from "react";
import IndiaMap              from "./components/IndiaMap.jsx";
import StateDistrictMap      from "./components/StateDistrictMap.jsx";
import InterventionSimulator from "./components/InterventionSimulator.jsx";
import { STATE_CONFIG, C, pctToSolidColor } from "./utils/constants.js";

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({ level, activeState, onGoCountry }) {
  const label = STATE_CONFIG[activeState]?.label || activeState;
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10,
      fontFamily: "'JetBrains Mono',monospace", color: C.dim }}>
      <span
        onClick={level !== "country" ? onGoCountry : undefined}
        style={{
          color:  level !== "country" ? C.cyan : C.dim,
          cursor: level !== "country" ? "pointer" : "default",
          textDecoration: level !== "country" ? "underline dotted" : "none",
        }}>INDIA</span>
      {level !== "country" && (
        <>
          <span style={{ color: C.nano }}>›</span>
          <span style={{ color: C.dim }}>{label?.toUpperCase()}</span>
        </>
      )}
    </nav>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [view,        setView]        = useState("map");        // "map" | "simulator"
  const [level,       setLevel]       = useState("country");    // "country" | "state"
  const [activeState, setActiveState] = useState("maharashtra");
  const [mapKey,      setMapKey]      = useState(0);

  const goState = useCallback((stateKey) => {
    setActiveState(stateKey);
    setMapKey(k => k + 1);
    setLevel("state");
  }, []);

  const goCountry = useCallback(() => {
    setMapKey(k => k + 1);
    setLevel("country");
  }, []);

  if (view === "simulator") {
    return <InterventionSimulator onBack={() => setView("map")} />;
  }

  return (
    <div style={S.root}>
      {/* Scanline */}
      <div style={S.scanline} />

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Breadcrumb level={level} activeState={activeState} onGoCountry={goCountry} />
          <h1 style={S.title}>
            PREVENTIVE HEALTH{" "}
            <span style={{ color: C.cyan, textShadow: "0 0 20px rgba(0,245,255,0.5)" }}>
              INTELLIGENCE
            </span>
          </h1>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setView("simulator")} style={S.missionBtn}>
            ◈ MISSION CONTROL
          </button>
          {level !== "country" && (
            <button style={S.backBtn} onClick={goCountry}>← India</button>
          )}
        </div>
      </header>

      {/* ── Map area ── */}
      <main style={S.main}>
        {level === "country" ? (
          <div key={`country-${mapKey}`} style={S.mapWrap} className="map-enter">
            <IndiaMap onStateClick={goState} />
          </div>
        ) : (
          <div key={`state-${mapKey}-${activeState}`} style={S.mapWrap} className="map-enter">
            <StateDistrictMap stateKey={activeState} />
          </div>
        )}
      </main>
    </div>
  );
};

const S = {
  root: {
    height: "100vh", width: "100vw", background: "#000",
    display: "flex", flexDirection: "column", overflow: "hidden",
    fontFamily: "'Syne', sans-serif",
  },
  scanline: {
    position: "fixed", top: 0, left: 0, width: "100%", height: "2px",
    background: "linear-gradient(to bottom, transparent, rgba(0,245,255,0.04), transparent)",
    animation: "scanline 12s linear infinite",
    pointerEvents: "none", zIndex: 9999,
  },
  header: {
    display: "flex", alignItems: "center",
    padding: "10px 22px", gap: 14,
    borderBottom: "1px solid #07111f",
    background: "linear-gradient(to right, #000, #030609, #000)",
    flexShrink: 0,
  },
  title: {
    fontSize: 18, fontWeight: 800, color: "#e8f4ff",
    letterSpacing: "0.08em", lineHeight: 1,
  },
  missionBtn: {
    background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.35)",
    borderRadius: 8, padding: "7px 18px",
    color: C.cyan, fontSize: 11, fontWeight: 800,
    cursor: "pointer", fontFamily: "'JetBrains Mono',monospace",
    letterSpacing: "0.1em", boxShadow: "0 0 14px rgba(0,245,255,0.12)",
    animation: "glowPulse 3s ease infinite",
  },
  backBtn: {
    background: "transparent", border: "1px solid #0d2035",
    borderRadius: 8, padding: "6px 14px",
    color: C.dim, fontSize: 10, fontWeight: 700,
    cursor: "pointer", fontFamily: "'JetBrains Mono',monospace",
    letterSpacing: "0.08em",
  },
  main:    { flex: 1, overflow: "hidden", display: "flex" },
  mapWrap: { flex: 1, height: "100%" },
};

export default Dashboard;
