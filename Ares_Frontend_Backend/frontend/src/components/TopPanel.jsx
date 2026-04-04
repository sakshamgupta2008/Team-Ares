import React from "react";

const C = {
  low:    "#00ff9d", medium: "#ffb700", high: "#ff1a3c",
};
const BG = {
  low:    "#00ff9d10", medium: "#ffb70010", high: "#ff1a3c10",
};

function RiskBadge({ level, prefix = "" }) {
  const c = C[level] || "#4a7090";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: BG[level] || "#4a709010",
      border: `1px solid ${c}44`, borderRadius: 6,
      padding: "4px 12px", color: c,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c,
        boxShadow: `0 0 8px ${c}`, animation: "dotPulse 1.5s ease infinite" }} />
      {prefix}{level}
    </span>
  );
}

function StatBlock({ label, value, color, sub, glow }) {
  return (
    <div style={{
      textAlign: "center", padding: "0 22px",
      borderRight: "1px solid #0d2035",
    }}>
      <div style={{
        fontSize: 30, fontWeight: 800, color,
        fontFamily: "'JetBrains Mono', monospace",
        textShadow: glow ? `0 0 24px ${color}99, 0 0 48px ${color}44` : "none",
        lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 9, color: "#1a3a5c", textTransform: "uppercase",
        letterSpacing: "0.12em", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#4a7090", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const TopPanel = ({ district, mlData }) => {
  if (!district) return null;
  const { district: name, expected, actual, gap, risk, trend } = district;
  const trendArrow = gap > (trend?.predictedGap || gap) ? "↗ improving" :
                     gap < (trend?.predictedGap || gap) ? "↘ worsening" : "→ stable";

  const mlRisk = mlData?.risk_level;
  const mlPct  = mlData?.risk_pct;

  return (
    <div style={S.root}>
      {/* Left identity block */}
      <div style={S.leftBlock}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#e8f4ff",
          letterSpacing: "0.04em", lineHeight: 1 }}>{name}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <RiskBadge level={risk} prefix="SIM · " />
          {mlRisk && <RiskBadge level={mlRisk} prefix="ML · " />}
        </div>
        <div style={{ fontSize: 9, color: "#0d2035", marginTop: 8,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
          PREVENTIVE HEALTH COVERAGE ANALYSIS
        </div>
      </div>

      {/* Stats row */}
      <div style={S.stats}>
        <StatBlock label="Expected"        value={`${expected}%`}  color="#3d8dff" glow />
        <StatBlock label="Actual"          value={`${actual}%`}    color="#00f5ff" glow />
        <StatBlock
          label="Coverage Gap"
          value={`−${gap}%`}
          color={C[risk] || "#4a7090"}
          sub={trendArrow}
          glow
        />
        {trend && (
          <StatBlock
            label="6-Mo Forecast"
            value={`${trend.predictedActual}%`}
            color="#bf5fff"
            sub={`+${trend.trendDelta}% proj.`}
            glow
          />
        )}
        {mlPct != null && (
          <StatBlock
            label="ML Risk Score"
            value={`${mlPct}%`}
            color={C[mlRisk] || "#ffb700"}
            sub={`model: ${mlData.model_accuracy}% acc.`}
            glow
          />
        )}
      </div>
    </div>
  );
};

const S = {
  root: {
    display: "flex", alignItems: "center",
    padding: "16px 24px",
    background: "rgba(0,245,255,0.02)",
    gap: 20, flexWrap: "wrap",
  },
  leftBlock: {
    minWidth: 200, borderRight: "1px solid #0d2035", paddingRight: 24,
    flexShrink: 0,
  },
  stats: {
    display: "flex", flex: 1, alignItems: "center", flexWrap: "wrap",
  },
};

export default TopPanel;
