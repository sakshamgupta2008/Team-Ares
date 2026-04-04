import React, { useState, useEffect } from "react";
import TopPanel        from "./TopPanel.jsx";
import LeftPanel       from "./LeftPanel.jsx";
import RightPanel      from "./RightPanel.jsx";
import MLInsightsPanel from "./MLInsightsPanel.jsx";

const TABS = [
  { id: "trends", label: "📈  Trends" },
  { id: "ai",     label: "◆  AI Insights" },
  { id: "ml",     label: "⬡  ML Analysis" },
];

const DistrictOverlay = ({ district, detail, loading, onClose }) => {
  const [disease,   setDisease]   = useState("diabetes");
  const [activeTab, setActiveTab] = useState("trends");

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const diseases    = detail?.diseases || {};
  const diseaseData = diseases[disease] || null;
  const mlData      = detail?.ml || null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          zIndex: 400,
          cursor: "pointer",
        }}
      />

      {/* ── Panel — CENTERED ── */}
      <div
        className="overlay-enter"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          /* These 4 lines centre the panel perfectly */
          top:  "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          /* ─────────────────────────────────────── */
          width:  "min(96vw, 1160px)",
          height: "min(90vh, 740px)",
          zIndex: 401,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #07111f 0%, #030609 60%, #060d18 100%)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(0,245,255,0.15)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: [
            "0 0 0 1px rgba(0,245,255,0.06)",
            "0 32px 90px rgba(0,0,0,0.85)",
            "0 0 80px rgba(0,245,255,0.06)",
            "inset 0 1px 0 rgba(0,245,255,0.08)",
          ].join(", "),
        }}
      >
        {/* Corner glows */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 220, height: 220,
          background: "radial-gradient(circle at top left, rgba(0,245,255,0.07), transparent 65%)",
          pointerEvents: "none", borderRadius: "20px 0 0 0" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 220, height: 220,
          background: "radial-gradient(circle at bottom right, rgba(191,95,255,0.05), transparent 65%)",
          pointerEvents: "none", borderRadius: "0 0 20px 0" }} />
        {mlData?.ml_backed && (
          <div style={{ position: "absolute", top: "40%", right: 0, width: 120, height: 200,
            background: "radial-gradient(circle at right, rgba(0,255,157,0.04), transparent 70%)",
            pointerEvents: "none" }} />
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          title="Close (ESC)"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 20,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,26,60,0.08)", border: "1px solid rgba(255,26,60,0.25)",
            color: "#ff1a3c", fontSize: 11, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>✕</button>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 30, borderRadius: 20,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
              color: "#00f5ff", letterSpacing: "0.15em" }}>
              <span style={{ animation: "blink 0.8s infinite" }}>■</span>&nbsp; LOADING DATA…
            </div>
          </div>
        )}

        {/* Top Panel */}
        <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(0,245,255,0.08)" }}>
          <TopPanel
            district={district ? { ...district, ...(detail || {}) } : null}
            mlData={mlData}
          />
        </div>

        {/* Tab Bar */}
        <div style={{
          display: "flex", alignItems: "center",
          flexShrink: 0, borderBottom: "1px solid #0d2035",
          background: "rgba(0,0,0,0.3)", padding: "0 8px",
        }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "10px 18px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", border: "none",
                fontFamily: "'Syne', sans-serif",
                letterSpacing: "0.04em", transition: "all 0.2s",
                display: "flex", alignItems: "center",
                color:        activeTab === t.id ? "#00f5ff" : "#1a3a5c",
                borderBottom: activeTab === t.id ? "2px solid #00f5ff" : "2px solid transparent",
                background:   activeTab === t.id ? "rgba(0,245,255,0.04)" : "transparent",
                textShadow:  activeTab === t.id ? "0 0 12px rgba(0,245,255,0.5)" : "none",
              }}
            >
              {t.label}
              {t.id === "ml" && mlData?.ml_backed && (
                <span style={{ marginLeft: 6, fontSize: 9, background: "#00ff9d15",
                  border: "1px solid #00ff9d44", borderRadius: 4,
                  padding: "1px 5px", color: "#00ff9d" }}>LIVE</span>
              )}
            </button>
          ))}
          {mlData?.model_accuracy && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px",
              background: "rgba(0,255,157,0.05)", border: "1px solid rgba(0,255,157,0.15)",
              borderRadius: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff9d",
                boxShadow: "0 0 6px #00ff9d", animation: "dotPulse 2s infinite" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "#00ff9d" }}>
                {mlData.model_accuracy}% model acc.
              </span>
            </div>
          )}
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {activeTab === "trends" && (
            <LeftPanel diseases={diseases} onDiseaseChange={setDisease} />
          )}
          {activeTab === "ai" && (
            <RightPanel
              disease={disease}
              diseaseData={diseaseData}
              risk={district?.risk || "medium"}
              mlRisk={mlData?.risk_level}
            />
          )}
          {activeTab === "ml" && (
            <MLInsightsPanel mlData={mlData} />
          )}
        </div>
      </div>
    </>
  );
};

export default DistrictOverlay;
