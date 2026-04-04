/**
 * TopPanel.jsx — Header section inside DistrictOverlay
 * Shows district name, risk badge, key stats strip.
 * Exported as a named component; DistrictOverlay now renders this inline,
 * but keeping as separate file for clean imports.
 */
import React from "react";
import { pctToSolidColor, pctToRiskLabel, C } from "../utils/constants.js";

const TopPanel = ({ district, mlData }) => {
  if (!district) return null;

  const pct       = district?.ml_risk_pct ?? district?.pct ?? 55;
  const riskKey   = district?.ml_risk ?? district?.risk ?? pctToRiskLabel(pct);
  const riskColor = pctToSolidColor(pct);
  const name      = district?.name || district?.district || "District";
  const expected  = district?.expected ?? "--";
  const actual    = district?.actual   ?? "--";
  const gap       = district?.gap      ?? "--";

  return (
    <div style={S.root}>
      {/* Left: Name + badge */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em", marginBottom: 4 }}>
          DISTRICT HEALTH INTELLIGENCE
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e8f4ff", lineHeight: 1, margin: 0 }}>
            {name}
          </h2>
          <span style={{
            background: `${riskColor}15`, border: `1px solid ${riskColor}44`,
            borderRadius: 6, padding: "3px 12px",
            color: riskColor, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: riskColor, boxShadow: `0 0 6px ${riskColor}`,
              display: "inline-block", animation: "dotPulse 1.5s infinite",
            }} />
            {riskKey} risk
          </span>
          {mlData?.ml_backed && (
            <span style={{
              background: "rgba(0,255,157,0.08)", border: "1px solid rgba(0,255,157,0.25)",
              borderRadius: 6, padding: "3px 10px",
              color: C.green, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
            }}>⬡ ML VERIFIED</span>
          )}
        </div>
      </div>

      {/* Right: stat chips */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "ML RISK",  value: `${pct}%`,   color: riskColor },
          { label: "EXPECTED", value: `${expected}%`, color: C.blue   },
          { label: "ACTUAL",   value: `${actual}%`,   color: C.cyan   },
          { label: "GAP",      value: `-${gap}%`,      color: riskColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            textAlign: "center", background: "#060d18",
            border: "1px solid #1a3a5c", borderRadius: 8, padding: "7px 12px",
            minWidth: 72,
          }}>
            <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.1em", marginBottom: 3 }}>
              {label}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 800, color,
              fontFamily: "'JetBrains Mono',monospace",
              textShadow: `0 0 12px ${color}55`,
            }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const S = {
  root: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "14px 22px", flexWrap: "wrap",
  },
};

export default TopPanel;
