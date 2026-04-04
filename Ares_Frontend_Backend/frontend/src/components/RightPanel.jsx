import React from "react";
import { getSuggestion } from "../utils/suggestions.js";

const C = { low: "#00ff9d", medium: "#ffb700", high: "#ff1a3c" };
const BG = { low: "#00ff9d0d", medium: "#ffb7000d", high: "#ff1a3c0d" };
const DC = { diabetes: "#00f5ff", bp: "#ffb700", obesity: "#bf5fff" };

function Bar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: "#4a7090", fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: "#07111f", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`, background: color,
          borderRadius: 3, boxShadow: `0 0 8px ${color}55`,
          transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
          animation: "barFill 0.8s ease both",
        }} />
      </div>
    </div>
  );
}

const RightPanel = ({ disease = "diabetes", diseaseData, risk = "medium", mlRisk }) => {
  if (!diseaseData) return (
    <div style={{ ...S.root, alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#1a3a5c", fontSize: 12 }}>No data</div>
    </div>
  );

  const { prediction }  = diseaseData;
  const suggestions     = getSuggestion(risk, disease);
  const barColor        = DC[disease] || "#00f5ff";
  const riskColor       = C[risk]     || "#4a7090";
  const mlRiskColor     = mlRisk ? C[mlRisk] : null;

  return (
    <div style={S.root}>

      {/* ML vs Simulated comparison */}
      {mlRisk && mlRisk !== risk && (
        <div style={S.compBox}>
          <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.1em", marginBottom: 6 }}>
            RISK COMPARISON
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#1a3a5c" }}>SIMULATED</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: riskColor,
                fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase" }}>{risk}</div>
            </div>
            <div style={{ flex: 1, height: 1, background: "#0d2035" }} />
            <div style={{ fontSize: 12, color: "#1a3a5c" }}>≠</div>
            <div style={{ flex: 1, height: 1, background: "#0d2035" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#1a3a5c" }}>ML MODEL</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: mlRiskColor,
                fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase" }}>{mlRisk}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#4a7090", marginTop: 6, textAlign: "center" }}>
            ML model assessment differs — consider ML result as primary
          </div>
        </div>
      )}

      {/* Prediction section */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          <span style={{ color: "#bf5fff" }}>◈</span> TREND PREDICTION · NEXT 6 MONTHS
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "#1a3a5c" }}>Projected risk level</span>
          <span style={{
            background: BG[prediction.risk] || "#4a709010",
            border: `1px solid ${C[prediction.risk] || "#4a7090"}44`,
            borderRadius: 6, padding: "3px 10px",
            color: C[prediction.risk] || "#4a7090",
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
          }}>{prediction.risk}</span>
        </div>

        <div>
          {prediction.months.map((m, i) => (
            <Bar key={m} label={m} value={prediction.values[i]} color={barColor} />
          ))}
        </div>

        <div style={S.trajBox}>
          <span style={{ fontSize: 10, color: "#1a3a5c" }}>Trajectory</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: barColor }}>
              {prediction.values[0]}%
            </span>
            <span style={{ color: "#0d2035", fontSize: 14 }}>→</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: "#bf5fff" }}>
              {prediction.values[5]}%
            </span>
            <span style={{
              fontSize: 11, color: "#00ff9d",
              background: "#00ff9d0d", border: "1px solid #00ff9d22",
              padding: "2px 7px", borderRadius: 4,
            }}>
              +{prediction.values[5] - prediction.values[0]}%
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "linear-gradient(to right,transparent,#0d2035,transparent)", margin: "14px 0", flexShrink: 0 }} />

      {/* AI suggestions */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          <span style={{ color: "#00f5ff" }}>◆</span> AI RECOMMENDATIONS
          <span style={{ marginLeft: 8, fontSize: 9, background: "#07111f", border: "1px solid #0d2035",
            borderRadius: 4, padding: "2px 6px", color: "#1a3a5c" }}>
            {risk.toUpperCase()} · {disease.toUpperCase()}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {suggestions.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              background: "#060d18", border: `1px solid ${riskColor}1a`,
              borderRadius: 8, padding: "10px 12px",
              transition: "border-color 0.3s",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: `${riskColor}12`, border: `1px solid ${riskColor}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: riskColor,
              }}>{i + 1}</div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#4a7090" }}>{s}</div>
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 12, padding: "8px 12px",
          background: "#060d18", borderRadius: 8,
          border: `1px solid ${riskColor}22`,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: riskColor,
            boxShadow: `0 0 8px ${riskColor}`, animation: "dotPulse 1.5s ease infinite" }} />
          <span style={{ fontSize: 10, color: riskColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {risk === "high" ? "Urgent Action Required" :
             risk === "medium" ? "Action Recommended" : "Monitor & Maintain"}
          </span>
        </div>
      </div>
    </div>
  );
};

const S = {
  root: {
    height: "100%", display: "flex", flexDirection: "column",
    padding: "16px", overflowY: "auto",
  },
  compBox: {
    background: "#060d18", border: "1px solid #122944",
    borderRadius: 10, padding: "12px", marginBottom: 14, flexShrink: 0,
  },
  section: { flexShrink: 0 },
  sectionTitle: {
    fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
    color: "#1a3a5c", letterSpacing: "0.12em", marginBottom: 10,
    display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase",
  },
  trajBox: {
    marginTop: 10, padding: "10px 14px",
    background: "#060d18", borderRadius: 8, border: "1px solid #0d2035",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
};

export default RightPanel;
