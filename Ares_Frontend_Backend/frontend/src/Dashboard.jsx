import React, { useState, useEffect, useCallback } from "react";
import IndiaMap              from "./components/IndiaMap.jsx";
import StateDistrictMap      from "./components/StateDistrictMap.jsx";
import DistrictOverlay       from "./components/DistrictOverlay.jsx";
import InterventionSimulator from "./components/InterventionSimulator.jsx";

const C = { low: "#00ff9d", medium: "#ffb700", high: "#ff1a3c", default: "#0d2035" };

// ── Stat Card ────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: "#07111f", border: `1px solid ${color}22`,
      borderRadius: 10, padding: "9px 14px", minWidth: 95,
      boxShadow: `0 0 18px ${color}0d`,
    }}>
      <div style={{ fontSize: 19, fontWeight: 800, color,
        fontFamily: "'JetBrains Mono', monospace",
        textShadow: `0 0 16px ${color}88`, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#1a3a5c", marginTop: 3,
        textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: "#4a7090", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────────
const STATE_LABELS = {
  maharashtra:      "MAHARASHTRA",
  "madhya-pradesh": "MADHYA PRADESH",
  karnataka:        "KARNATAKA",
};

function Breadcrumb({ level, activeState, onGoCountry }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace", color: "#1a3a5c" }}>
      <span
        onClick={level !== "country" ? onGoCountry : undefined}
        style={{
          color: level !== "country" ? "#00f5ff" : "#1a3a5c",
          cursor: level !== "country" ? "pointer" : "default",
          textDecoration: level !== "country" ? "underline dotted" : "none",
        }}>INDIA</span>
      {level !== "country" && (
        <>
          <span style={{ color: "#0d2035" }}>›</span>
          <span style={{ color: "#1a3a5c" }}>
            {STATE_LABELS[activeState] || activeState?.toUpperCase()}
          </span>
        </>
      )}
    </nav>
  );
}

function MLBadge({ summary }) {
  if (!summary) return null;
  const online = summary.ml_online;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      background: online ? "rgba(0,255,157,0.05)" : "rgba(255,26,60,0.05)",
      border: `1px solid ${online ? "rgba(0,255,157,0.2)" : "rgba(255,26,60,0.2)"}`,
      borderRadius: 8, padding: "5px 12px",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%",
        background: online ? "#00ff9d" : "#ff1a3c",
        boxShadow: `0 0 6px ${online ? "#00ff9d" : "#ff1a3c"}`,
        animation: "dotPulse 2s infinite" }} />
      <span style={{ fontSize: 9, color: online ? "#00ff9d" : "#ff1a3c", letterSpacing: "0.12em" }}>
        {online ? `ML ONLINE · ${summary.ml_accuracy}% ACC` : "ML OFFLINE"}
      </span>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
const Dashboard = () => {
  const [view,          setView]          = useState("map");      // "map" | "simulator"
  const [level,         setLevel]         = useState("country");  // "country" | "state"
  const [activeState,   setActiveState]   = useState("maharashtra");
  const [selDistrict,   setSelDistrict]   = useState(null);       // key for MH overlay
  const [districtData,  setDistrictData]  = useState({});         // MH live data
  const [summary,       setSummary]       = useState(null);
  const [detailData,    setDetailData]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mapKey,        setMapKey]        = useState(0);

  // Fetch Maharashtra backend data
  useEffect(() => {
    if (level !== "state" || activeState !== "maharashtra") return;
    fetch("http://localhost:5000/districts")
      .then(r => r.json())
      .then(data => {
        const m = {};
        data.forEach(d => { m[d.district.toLowerCase().trim()] = d; });
        setDistrictData(m);
      }).catch(console.error);

    fetch("http://localhost:5000/summary")
      .then(r => r.json())
      .then(setSummary)
      .catch(console.error);
  }, [level, activeState]);

  // Fetch district detail (Maharashtra only — full overlay)
  useEffect(() => {
    if (!selDistrict || activeState !== "maharashtra") {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    fetch(`http://localhost:5000/district/${encodeURIComponent(selDistrict)}`)
      .then(r => r.json())
      .then(d => { setDetailData(d); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }, [selDistrict, activeState]);

  const goState = useCallback((stateKey = "maharashtra") => {
    setActiveState(stateKey);
    setSelDistrict(null);
    setMapKey(k => k + 1);
    setLevel("state");
  }, []);

  const goCountry = useCallback(() => {
    setSelDistrict(null);
    setDetailData(null);
    setMapKey(k => k + 1);
    setLevel("country");
  }, []);

  // liveDistrictData shaped for StateDistrictMap
  const liveDistrictData = {};
  if (activeState === "maharashtra") {
    Object.entries(districtData).forEach(([key, val]) => {
      liveDistrictData[key] = {
        risk:        val.ml_risk || val.risk,
        expected:    val.expected,
        actual:      val.actual,
        gap:         val.gap,
        ml_risk_pct: val.ml_risk_pct,
        ml_backed:   val.ml_backed,
      };
    });
  }

  // District click handler for MH — opens full overlay
  const handleMHDistrictClick = useCallback((key) => {
    setSelDistrict(key);
  }, []);

  // ── Simulator full-screen ─────────────────────────────────────────────
  if (view === "simulator") {
    return <InterventionSimulator onBack={() => setView("map")} />;
  }

  const isMaharashtra = activeState === "maharashtra";

  return (
    <div style={S.root}>
      <div style={S.scanline} />

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Breadcrumb level={level} activeState={activeState} onGoCountry={goCountry} />
          <h1 style={S.title}>
            PREVENTIVE HEALTH{" "}
            <span style={{ color: "#00f5ff", textShadow: "0 0 20px rgba(0,245,255,0.5)" }}>
              INTELLIGENCE
            </span>
          </h1>
        </div>

        {level === "state" && isMaharashtra && summary && (
          <div style={S.statRow}>
            <StatCard label="Districts" value={summary.total}         color="#00f5ff" />
            <StatCard label="High Risk" value={summary.high}          color="#ff1a3c" sub="Urgent" />
            <StatCard label="Medium"    value={summary.medium}        color="#ffb700" />
            <StatCard label="Avg Gap"   value={`${summary.avgGap}%`}  color="#bf5fff" sub="Expected vs Actual" />
            <StatCard label="Worst"     value={summary.worstDistrict} color="#ff4d6a" sub={`Gap: ${summary.worstGap}%`} />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
          {level === "state" && isMaharashtra && <MLBadge summary={summary} />}
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
          <div key={`c-${mapKey}`} style={{ flex: 1, height: "100%" }} className="map-enter">
            <IndiaMap onStateClick={goState} />
          </div>
        ) : (
          /* All 3 states use unified StateDistrictMap */
          <div key={`s-${mapKey}`} style={{ flex: 1, height: "100%" }} className="map-enter">
            <StateDistrictMap
              stateKey={activeState}
              onBack={goCountry}
              onOpenSimulator={() => setView("simulator")}
              liveDistrictData={liveDistrictData}
              // Only MH gets full overlay on click; others show local panel
              onDistrictClick={isMaharashtra ? handleMHDistrictClick : undefined}
            />
          </div>
        )}
      </main>

      {/* District detail overlay — Maharashtra full analysis only */}
      {selDistrict && isMaharashtra && (
        <DistrictOverlay
          district={districtData[selDistrict] || null}
          detail={detailData}
          loading={detailLoading}
          onClose={() => setSelDistrict(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

// ── Styles ───────────────────────────────────────────────────────────────
const S = {
  root: {
    height: "100vh", width: "100vw", background: "#000",
    display: "flex", flexDirection: "column", overflow: "hidden",
    fontFamily: "'Syne', sans-serif",
  },
  scanline: {
    position: "fixed", top: 0, left: 0, width: "100%", height: "2px",
    background: "linear-gradient(to bottom, transparent, rgba(0,245,255,0.05), transparent)",
    animation: "scanline 10s linear infinite",
    pointerEvents: "none", zIndex: 9999,
  },
  header: {
    display: "flex", alignItems: "center", flexWrap: "wrap",
    padding: "10px 20px", gap: 14,
    borderBottom: "1px solid #07111f",
    background: "linear-gradient(to right, #000, #030609, #000)",
    flexShrink: 0,
  },
  title: {
    fontSize: 17, fontWeight: 800, color: "#e8f4ff",
    letterSpacing: "0.08em", lineHeight: 1,
  },
  statRow: {
    display: "flex", gap: 8, flex: 1, flexWrap: "wrap", justifyContent: "center",
  },
  backBtn: {
    background: "transparent", border: "1px solid #0d2035",
    borderRadius: 8, padding: "6px 14px",
    color: "#1a3a5c", fontSize: 10, fontWeight: 700,
    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.08em",
  },
  missionBtn: {
    background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.35)",
    borderRadius: 8, padding: "7px 16px",
    color: "#00f5ff", fontSize: 10, fontWeight: 800,
    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.1em", boxShadow: "0 0 14px rgba(0,245,255,0.12)",
    animation: "glowPulse 3s ease infinite",
  },
  main: { flex: 1, overflow: "hidden", display: "flex" },
};
