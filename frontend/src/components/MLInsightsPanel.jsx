/**
 * MLInsightsPanel.jsx — ML Analysis Tab
 * Solid risk colors only. Feature importance bar chart.
 */
import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { pctToSolidColor, pctToRiskLabel, C } from "../utils/constants.js";

const BAR_COLORS = ["#00f5ff","#00d4e0","#00b3c0","#0092a0","#00718f","#003050"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "#030609", border: "1px solid #0d2035",
      borderRadius: 8, padding: "10px 14px", backdropFilter: "blur(16px)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, marginBottom: 6 }}>{d.label}</div>
      <div style={{ fontSize: 11, color: "#4a7090" }}>
        Importance: <span style={{ color: C.cyan, fontFamily: "'JetBrains Mono',monospace" }}>{d.importance}%</span>
      </div>
      <div style={{ fontSize: 11, color: "#4a7090", marginTop: 3 }}>
        Direction:{" "}
        <span style={{ color: d.direction === "risk-increasing" ? C.red : C.green }}>
          {d.direction === "risk-increasing" ? "↑ Raises risk" : "↓ Reduces risk"}
        </span>
      </div>
      {d.p_value !== undefined && (
        <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>
          p = {d.p_value < 0.001 ? "<0.001" : d.p_value.toFixed(4)}
        </div>
      )}
    </div>
  );
};

const MLInsightsPanel = ({ mlData }) => {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 200);
    return () => clearTimeout(t);
  }, [mlData]);

  if (!mlData?.ml_backed) {
    return (
      <div style={S.empty}>
        <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.2 }}>⬡</div>
        <div style={{ fontSize: 13, color: C.dim }}>District not in ML training set</div>
        <div style={{ fontSize: 10, color: "#0d2035", marginTop: 8, lineHeight: 1.8 }}>
          ML insights available for:<br />
          Pune · Nagpur · Thane · Nashik · Aurangabad<br />
          Nanded · Solapur · Kolhapur · Amravati · Mumbai Suburban
        </div>
        <div style={{ marginTop: 16, padding: "10px 14px",
          background: "rgba(255,183,0,0.06)", border: "1px solid rgba(255,183,0,0.2)",
          borderRadius: 8, fontSize: 10, color: C.amber, maxWidth: 300 }}>
          ⬡ Full ML analysis will be available once district-level training data is integrated for this region.
        </div>
      </div>
    );
  }

  const {
    risk_pct, risk_level, confidence, std, sample_n,
    model_accuracy, top_features = [], min_pct, max_pct,
  } = mlData;

  const riskColor = pctToSolidColor(risk_pct);
  const confColor = { high: C.green, medium: C.amber, low: C.red }[confidence] || "#4a7090";

  const chartData = top_features.slice(0, 6).map((f, i) => ({
    ...f,
    shortLabel: f.label.split(" ").slice(0, 2).join(" "),
    color: BAR_COLORS[i] || "#003050",
  }));

  return (
    <div style={S.root}>
      {/* Model badge */}
      <div style={S.modelBadge}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green,
            boxShadow: `0 0 8px ${C.green}`, animation: "dotPulse 2s infinite" }} />
          <span style={{ fontSize: 9, color: "#4a7090", letterSpacing: "0.12em" }}>
            RANDOM FOREST MODEL
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
          fontWeight: 700, color: C.green }}>{model_accuracy}% ACCURACY</span>
      </div>

      {/* Risk score */}
      <div style={S.riskDisplay}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase",
            letterSpacing: "0.12em", marginBottom: 6 }}>ML RISK SCORE</div>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1,
            fontFamily: "'JetBrains Mono',monospace",
            color: riskColor, textShadow: `0 0 30px ${riskColor}66` }}>
            {risk_pct}<span style={{ fontSize: 18, fontWeight: 400, marginLeft: 3 }}>%</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{
              background: `${riskColor}15`, border: `1px solid ${riskColor}44`,
              borderRadius: 6, padding: "4px 14px",
              color: riskColor, fontSize: 12, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              {risk_level} risk
            </span>
          </div>
        </div>

        <div style={S.metaCol}>
          {[
            { label: "CONFIDENCE", value: confidence?.toUpperCase(), color: confColor },
            { label: "SAMPLE SIZE", value: sample_n?.toLocaleString(), color: C.cyan },
            { label: "VARIANCE (σ)", value: `${(std * 100).toFixed(1)}%`, color: C.purple },
          ].map(({ label, value, color }) => (
            <div key={label} style={S.metaBox}>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em" }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color,
                fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk range bar */}
      <div style={S.rangeRow}>
        <span style={{ fontSize: 10, color: C.dim }}>{min_pct?.toFixed(0)}%</span>
        <div style={{ flex: 1, height: 6, background: "#0d2035", borderRadius: 3,
          overflow: "hidden", margin: "0 8px" }}>
          <div style={{
            height: "100%",
            marginLeft: `${min_pct ?? 0}%`,
            width: `${(max_pct ?? 100) - (min_pct ?? 0)}%`,
            background: riskColor,
            borderRadius: 3,
            boxShadow: `0 0 6px ${riskColor}88`,
          }} />
        </div>
        <span style={{ fontSize: 10, color: C.dim }}>{max_pct?.toFixed(0)}%</span>
        <span style={{ fontSize: 9, color: "#0d2035", marginLeft: 8 }}>pop. range</span>
      </div>

      <div style={{ height: 1, background: "linear-gradient(to right,transparent,#0d2035,transparent)", margin: "10px 0" }} />

      {/* Feature importance */}
      <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase",
        letterSpacing: "0.12em", marginBottom: 8 }}>
        KEY RISK DRIVERS (Feature Importance)
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height={175}>
          <BarChart data={chartData} layout="vertical"
            margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, "auto"]}
              tick={{ fill: C.dim, fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="shortLabel" width={110}
              tick={{ fill: "#4a7090", fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="importance" radius={[0,3,3,0]} barSize={10}
              animationBegin={200} animationDuration={800}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.color}
                  style={{ filter: `drop-shadow(0 0 4px ${e.color}88)` }} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 6, flexShrink: 0 }}>
        {[
          { color: C.red,   label: "Risk-increasing" },
          { color: C.green, label: "Risk-reducing"   },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 9, color: C.dim }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#0d2035" }}>p &lt; 0.05 all features</div>
      </div>
    </div>
  );
};

const S = {
  root: {
    height: "100%", display: "flex", flexDirection: "column",
    padding: "16px", overflow: "hidden",
  },
  empty: {
    height: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    color: C.dim, textAlign: "center", padding: 24,
  },
  modelBadge: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#060d18", border: "1px solid #0d2035",
    borderRadius: 8, padding: "6px 12px", marginBottom: 14, flexShrink: 0,
  },
  riskDisplay: {
    display: "flex", alignItems: "flex-start", gap: 16,
    marginBottom: 12, flexShrink: 0,
  },
  metaCol: { display: "flex", flexDirection: "column", gap: 6 },
  metaBox: {
    background: "#060d18", border: "1px solid #0d2035",
    borderRadius: 6, padding: "5px 10px", minWidth: 90,
  },
  rangeRow: {
    display: "flex", alignItems: "center", marginBottom: 4, flexShrink: 0,
  },
};

export default MLInsightsPanel;
