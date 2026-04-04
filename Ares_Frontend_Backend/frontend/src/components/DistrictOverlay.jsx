/**
 * DistrictOverlay.jsx — Centered modal panel for ALL states.
 *
 * Identical layout regardless of which state was clicked.
 * Centered via:  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%)
 *
 * Tabs:
 *   📈 Trends    → LeftPanel   (disease charts + gap bars)
 *   ◆  AI Chat   → AIChatPanel (live Gemini/Claude chat — Flow B)
 *   💡 Insights  → RightPanel  (rule-based suggestions)
 *   ⬡  ML        → MLInsightsPanel (feature importance)
 */
import React, { useState, useEffect } from "react";
import TopPanel        from "./TopPanel.jsx";
import LeftPanel       from "./LeftPanel.jsx";
import RightPanel      from "./RightPanel.jsx";
import AIChatPanel     from "./AIChatPanel.jsx";
import MLInsightsPanel from "./MLInsightsPanel.jsx";
import { pctToSolidColor, pctToRiskLabel, C } from "../utils/constants.js";

const TABS = [
  { id: "trends",   label: "📈  Trends"     },
  { id: "ai",       label: "◆  AI Chat"     },
  { id: "insights", label: "💡  Insights"   },
  { id: "ml",       label: "⬡  ML Analysis" },
];

const DistrictOverlay = ({ district, detail, loading, onClose }) => {
  const [activeTab, setActiveTab] = useState("trends");
  const [disease,   setDisease]   = useState("diabetes");

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    setActiveTab("trends");
    setDisease("diabetes");
  }, [district?.id]);

  const diseases    = detail?.diseases    || {};
  const mlData      = detail?.ml          || null;
  const chatPayload = detail?.chatPayload || null;
  const diseaseData = diseases[disease]   || null;

  const pct     = district?.pct ?? district?.ml_risk_pct ?? 55;
  const riskKey = district?.risk ?? pctToRiskLabel(pct);
  const rc      = pctToSolidColor(pct);

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        cursor: "pointer",
      }} />

      <div className="overlay-enter" onClick={e => e.stopPropagation()} style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(96vw, 1180px)", height: "min(90vh, 760px)",
        zIndex: 401, display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #07111f 0%, #030609 55%, #060d18 100%)",
        backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
        border: `1px solid ${rc}20`, borderRadius: 20, overflow: "hidden",
        boxShadow: [
          `0 0 0 1px ${rc}08`, "0 32px 90px rgba(0,0,0,0.88)",
          `0 0 80px ${rc}08`, "inset 0 1px 0 rgba(0,245,255,0.08)",
        ].join(", "),
      }}>

        {/* Corner glows */}
        <div style={{ position:"absolute",top:0,left:0,width:240,height:240,
          background:"radial-gradient(circle at top left,rgba(0,245,255,0.07),transparent 65%)",
          pointerEvents:"none",borderRadius:"20px 0 0 0" }} />
        <div style={{ position:"absolute",bottom:0,right:0,width:240,height:240,
          background:`radial-gradient(circle at bottom right,${rc}0b,transparent 65%)`,
          pointerEvents:"none",borderRadius:"0 0 20px 0" }} />

        {/* Close */}
        <button onClick={onClose} title="Close (ESC)" style={{
          position:"absolute",top:14,right:14,zIndex:20,
          width:30,height:30,borderRadius:"50%",
          background:"rgba(255,26,60,0.08)",border:"1px solid rgba(255,26,60,0.28)",
          color:"#ff1a3c",fontSize:12,fontWeight:700,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>✕</button>

        {/* Top panel */}
        <div style={{ flexShrink:0, borderBottom:"1px solid rgba(0,245,255,0.08)" }}>
          <TopPanel district={district ? { ...district, ...(detail||{}) } : null} mlData={mlData} />
        </div>

        {/* Tab bar */}
        <div style={{
          display:"flex",alignItems:"center",flexShrink:0,
          borderBottom:"1px solid #0d2035",background:"rgba(0,0,0,0.3)",padding:"0 8px",
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding:"10px 20px",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",
              fontFamily:"'Syne',sans-serif",letterSpacing:"0.04em",transition:"all 0.2s",
              display:"flex",alignItems:"center",gap:5,
              color:        activeTab===t.id ? C.cyan : C.dim,
              borderBottom: activeTab===t.id ? `2px solid ${C.cyan}` : "2px solid transparent",
              background:   activeTab===t.id ? "rgba(0,245,255,0.04)" : "transparent",
              textShadow:   activeTab===t.id ? "0 0 12px rgba(0,245,255,0.5)" : "none",
            }}>
              {t.label}
              {t.id==="ml" && mlData?.ml_backed && (
                <span style={{ fontSize:9,background:"#00ff9d12",border:"1px solid #00ff9d44",
                  borderRadius:4,padding:"1px 5px",color:C.green }}>LIVE</span>
              )}
              {t.id==="ai" && (
                <span style={{ fontSize:9,background:"rgba(0,245,255,0.08)",
                  border:"1px solid rgba(0,245,255,0.25)",borderRadius:4,
                  padding:"1px 5px",color:C.cyan }}>AI</span>
              )}
            </button>
          ))}
          {mlData?.model_accuracy && (
            <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6,
              padding:"4px 12px",background:"rgba(0,255,157,0.05)",
              border:"1px solid rgba(0,255,157,0.15)",borderRadius:6 }}>
              <div style={{ width:5,height:5,borderRadius:"50%",background:C.green,
                boxShadow:`0 0 6px ${C.green}`,animation:"dotPulse 2s infinite" }} />
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.green }}>
                {mlData.model_accuracy}% model accuracy
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex:1, minHeight:0, overflow:"hidden" }}>
          {activeTab==="trends"   && <LeftPanel diseases={diseases} onDiseaseChange={setDisease} />}
          {activeTab==="ai"       && <AIChatPanel chatPayload={chatPayload} districtName={district?.name||""} />}
          {activeTab==="insights" && <RightPanel disease={disease} diseaseData={diseaseData} risk={riskKey} mlRisk={mlData?.risk_level} />}
          {activeTab==="ml"       && <MLInsightsPanel mlData={mlData} />}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position:"absolute",inset:0,background:"rgba(0,0,0,0.78)",
            display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",zIndex:30,borderRadius:20,gap:14,
          }}>
            <div style={{ width:38,height:38,border:"2px solid #0d2035",
              borderTop:`2px solid ${C.cyan}`,borderRadius:"50%",
              animation:"spin 0.75s linear infinite" }} />
            <div style={{ fontFamily:"'JetBrains Mono',monospace",
              fontSize:12,color:C.cyan,letterSpacing:"0.15em" }}>
              <span style={{ animation:"blink 0.8s infinite" }}>■</span>&nbsp; LOADING DATA…
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DistrictOverlay;
