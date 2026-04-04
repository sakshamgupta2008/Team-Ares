/**
 * RightPanel.jsx — "AI Insights" sub-panel inside DistrictOverlay.
 * Shows rule-based suggestions (from suggestions.js) + quick risk breakdown.
 * This is distinct from AIChatPanel (which does live Gemini chat).
 * Kept for backward compatibility; DistrictOverlay shows it on the "ai" tab
 * but we've replaced it with AIChatPanel. Keeping file so old imports don't break.
 */
import React from "react";
import { getSuggestion } from "../utils/suggestions.js";
import { pctToSolidColor, C } from "../utils/constants.js";

const RightPanel = ({ disease = "diabetes", diseaseData, risk = "medium", mlRisk }) => {
  const suggestions = getSuggestion(mlRisk || risk, disease);
  const riskColor   = pctToSolidColor(risk === "high" ? 70 : risk === "medium" ? 50 : 25);

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>◆</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan,
            letterSpacing: "0.08em" }}>AI RECOMMENDATIONS</span>
        </div>
        <span style={{
          background: `${riskColor}15`, border: `1px solid ${riskColor}33`,
          borderRadius: 5, padding: "2px 8px",
          color: riskColor, fontSize: 9, fontWeight: 700,
          textTransform: "uppercase",
        }}>{mlRisk || risk} priority</span>
      </div>

      {/* Disease context */}
      {diseaseData && (
        <div style={S.diseaseCard}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em", marginBottom: 8 }}>
            {disease.toUpperCase()} SNAPSHOT
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { l: "PREVALENCE", v: `${diseaseData.prevalence ?? "--"}%`, c: riskColor },
              { l: "COVERAGE GAP", v: `${diseaseData.gap ?? "--"}%`,      c: C.amber  },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ flex: 1, textAlign: "center",
                background: "#060d18", border: "1px solid #1a3a5c",
                borderRadius: 8, padding: "8px 6px" }}>
                <div style={{ fontSize: 8, color: C.dim, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c,
                  fontFamily: "'JetBrains Mono',monospace",
                  textShadow: `0 0 12px ${c}55` }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em", marginBottom: 10 }}>
        RECOMMENDED INTERVENTIONS
      </div>
      {suggestions.map((s, i) => (
        <div key={i} style={S.suggCard}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: `${C.cyan}15`, border: `1px solid ${C.cyan}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.cyan, fontSize: 9, fontWeight: 800, marginTop: 1,
            }}>{i + 1}</div>
            <p style={{ fontSize: 12, color: "#c8dff0", lineHeight: 1.65, margin: 0 }}>{s}</p>
          </div>
        </div>
      ))}

      {/* Priority note */}
      <div style={{
        marginTop: "auto", padding: "10px 12px",
        background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)",
        borderRadius: 8, fontSize: 10, color: "#7aa2c7", lineHeight: 1.6,
      }}>
        ◆ Switch to the <strong style={{ color: C.cyan }}>AI Analyst</strong> tab for a
        live conversation with the PreventiQ intelligence engine.
      </div>
    </div>
  );
};

const S = {
  root: {
    height: "100%", display: "flex", flexDirection: "column",
    padding: "16px", gap: 14, overflowY: "auto",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#060d18", border: "1px solid #1a3a5c",
    borderRadius: 8, padding: "8px 12px", flexShrink: 0,
  },
  diseaseCard: {
    background: "#060d18", border: "1px solid #1a3a5c",
    borderRadius: 10, padding: "12px", flexShrink: 0,
  },
  suggCard: {
    background: "#07111f", border: "1px solid #1a3a5c",
    borderRadius: 10, padding: "12px 14px",
    transition: "border-color 0.2s",
  },
};

export default RightPanel;
