import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Cell,
  Tooltip, ResponsiveContainer,
} from "recharts";

const NEON = {
  cyan:   "#00f5ff",
  green:  "#00ff9d",
  red:    "#ff1a3c",
  amber:  "#ffb700",
  purple: "#bf5fff",
};

const BAR_COLORS = [
  "#00f5ff","#00d4e0","#00b3c0","#0092a0","#00718f","#00506e","#003050",
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "#030609", border: "1px solid #0d2035",
      borderRadius: 8, padding: "10px 14px",
      backdropFilter: "blur(16px)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#00f5ff", marginBottom: 6 }}>{d.label}</div>
      <div style={{ fontSize: 11, color: "#4a7090" }}>Importance: <span style={{ color: "#00f5ff", fontFamily: "'JetBrains Mono', monospace" }}>{d.importance}%</span></div>
      <div style={{ fontSize: 11, color: "#4a7090", marginTop: 3 }}>
        Direction: <span style={{ color: d.direction === "risk-increasing" ? "#ff1a3c" : "#00ff9d" }}>
          {d.direction === "risk-increasing" ? "↑ Raises risk" : "↓ Reduces risk"}
        </span>
      </div>
      {d.p_value !== undefined && (
        <div style={{ fontSize: 10, color: "#1a3a5c", marginTop: 3 }}>
          p-value: {d.p_value < 0.001 ? "<0.001" : d.p_value.toFixed(4)}
        </div>
      )}
    </div>
  );
};

const MLInsightsPanel = ({ mlData }) => {
  const [animate, setAnimate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 200); return () => clearTimeout(t); }, [mlData]);

  if (!mlData || !mlData.ml_backed) {
    return (
      <div style={S.empty}>
        <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>⬡</div>
        <div style={{ fontSize: 12, color: "#1a3a5c" }}>District not in ML training set</div>
        <div style={{ fontSize: 10, color: "#0d2035", marginTop: 6 }}>
          ML insights available for: Pune, Nagpur, Thane, Nashik, Aurangabad,<br />
          Nanded, Solapur, Kolhapur, Amravati, Mumbai Suburban
        </div>
      </div>
    );
  }

  const { risk_pct, risk_level, confidence, std, sample_n, model_accuracy, top_features = [] } = mlData;
  const riskColor = { high: "#ff1a3c", medium: "#ffb700", low: "#00ff9d" }[risk_level] || "#00f5ff";
  const confColor = { high: "#00ff9d", medium: "#ffb700", low: "#ff1a3c" }[confidence] || "#4a7090";

  const chartData = top_features.slice(0, 6).map((f, i) => ({
    ...f,
    importance: f.importance,
    shortLabel: f.label.split(" ").slice(0, 2).join(" "),
    color: BAR_COLORS[i] || "#003050",
  }));

  return (
    <div style={S.root}>

      {/* ── Model badge ── */}
      <div style={S.modelBadge}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d",
            boxShadow: "0 0 8px #00ff9d", animation: "dotPulse 2s infinite" }} />
          <span style={{ fontSize: 9, color: "#4a7090", letterSpacing: "0.12em" }}>
            RANDOM FOREST MODEL
          </span>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700, color: "#00ff9d",
        }}>{model_accuracy}% ACCURACY</span>
      </div>

      {/* ── Risk score big display ── */}
      <div style={S.riskDisplay}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
            ML RISK SCORE
          </div>
          <div style={{
            fontSize: 48, fontWeight: 800, lineHeight: 1,
            fontFamily: "'JetBrains Mono', monospace",
            color: riskColor, textShadow: `0 0 30px ${riskColor}66`,
          }}>
            {risk_pct}<span style={{ fontSize: 18, fontWeight: 400, marginLeft: 3 }}>%</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{
              background: `${riskColor}15`, border: `1px solid ${riskColor}44`,
              borderRadius: 6, padding: "3px 12px",
              color: riskColor, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              {risk_level} risk
            </span>
          </div>
        </div>

        <div style={S.metaCol}>
          <div style={S.metaBox}>
            <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.1em" }}>CONFIDENCE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: confColor, fontFamily: "'JetBrains Mono', monospace" }}>
              {confidence?.toUpperCase()}
            </div>
          </div>
          <div style={S.metaBox}>
            <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.1em" }}>SAMPLE SIZE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#00f5ff", fontFamily: "'JetBrains Mono', monospace" }}>
              {sample_n?.toLocaleString()}
            </div>
          </div>
          <div style={S.metaBox}>
            <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.1em" }}>VARIANCE (σ)</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#bf5fff", fontFamily: "'JetBrains Mono', monospace" }}>
              {(std * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Risk range bar ── */}
      <div style={S.rangeRow}>
        <span style={{ fontSize: 10, color: "#1a3a5c" }}>{mlData.min_pct?.toFixed(0)}%</span>
        <div style={{ flex: 1, height: 6, background: "#0d2035", borderRadius: 3, overflow: "hidden", margin: "0 8px" }}>
          <div style={{
            height: "100%",
            marginLeft: `${mlData.min_pct ?? 0}%`,
            width: `${(mlData.max_pct ?? 100) - (mlData.min_pct ?? 0)}%`,
            background: `linear-gradient(to right, ${riskColor}44, ${riskColor})`,
            borderRadius: 3,
            transition: animate ? "none" : undefined,
          }} />
        </div>
        <span style={{ fontSize: 10, color: "#1a3a5c" }}>{mlData.max_pct?.toFixed(0)}%</span>
        <span style={{ fontSize: 9, color: "#0d2035", marginLeft: 8 }}>population range</span>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "linear-gradient(to right,transparent,#0d2035,transparent)", margin: "12px 0" }} />

      {/* ── Feature Importance chart ── */}
      <div style={{ fontSize: 9, color: "#1a3a5c", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
        KEY RISK DRIVERS (Feature Importance)
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, "auto"]}
              tick={{ fill: "#1a3a5c", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            <YAxis type="category" dataKey="shortLabel" width={110}
              tick={{ fill: "#4a7090", fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="importance" radius={[0, 3, 3, 0]} barSize={10}
                 animationBegin={200} animationDuration={800}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color}
                  style={{ filter: `drop-shadow(0 0 4px ${entry.color}88)` }} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Direction legend ── */}
      <div style={{ display: "flex", gap: 14, marginTop: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff1a3c" }} />
          <span style={{ fontSize: 9, color: "#1a3a5c" }}>Risk-increasing</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d" }} />
          <span style={{ fontSize: 9, color: "#1a3a5c" }}>Risk-reducing</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 9, color: "#0d2035" }}>
          p &lt; 0.05 all features
        </div>
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
    color: "#1a3a5c", textAlign: "center", padding: 24,
  },
  modelBadge: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#060d18", border: "1px solid #0d2035",
    borderRadius: 8, padding: "6px 12px", marginBottom: 14, flexShrink: 0,
  },
  riskDisplay: {
    display: "flex", alignItems: "flex-start",
    gap: 16, marginBottom: 12, flexShrink: 0,
  },
  metaCol: {
    display: "flex", flexDirection: "column", gap: 6,
  },
  metaBox: {
    background: "#060d18", border: "1px solid #0d2035",
    borderRadius: 6, padding: "5px 10px", minWidth: 90,
  },
  rangeRow: {
    display: "flex", alignItems: "center", marginBottom: 4, flexShrink: 0,
  },
};

export default MLInsightsPanel;
