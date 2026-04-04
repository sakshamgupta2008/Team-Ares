/**
 * LeftPanel.jsx — Disease Trends Tab
 * Shows prevalence bars + trend sparklines for diabetes, bp, obesity.
 */
import React, { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { pctToSolidColor, RISK_COLOR, C } from "../utils/constants.js";

const DISEASE_META = {
  diabetes: { label: "Diabetes",       icon: "🩸", color: C.red    },
  bp:       { label: "Hypertension",   icon: "💓", color: C.amber  },
  obesity:  { label: "Obesity / BMI",  icon: "⚖️", color: C.purple },
};

const CustomTooltip = ({ active, payload, label, color }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#030609", border: "1px solid #1a3a5c",
      borderRadius: 8, padding: "8px 12px", backdropFilter: "blur(12px)",
    }}>
      <div style={{ fontSize: 10, color: "#a5c5e1", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color,
        fontFamily: "'JetBrains Mono',monospace" }}>
        {payload[0].value}%
      </div>
    </div>
  );
};

const LeftPanel = ({ diseases = {} }) => {
  const [active, setActive] = useState("diabetes");
  const meta  = DISEASE_META[active];
  const data  = diseases[active];
  const trend = data?.trend || [];

  return (
    <div style={S.root}>
      {/* Disease selector tabs */}
      <div style={S.diseaseRow}>
        {Object.entries(DISEASE_META).map(([key, m]) => {
          const d = diseases[key];
          const prev = d?.prevalence ?? "--";
          const rc   = pctToSolidColor(typeof prev === "number" ? prev : 50);
          const isA  = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              style={{
                flex: 1, padding: "12px 10px", textAlign: "center",
                background: isA ? `${m.color}10` : "transparent",
                border: isA ? `1px solid ${m.color}44` : "1px solid #1a3a5c",
                borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: isA ? m.color : "#7aa2c7" }}>
                {m.label}
              </div>
              {typeof prev === "number" && (
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3,
                  fontFamily: "'JetBrains Mono',monospace",
                  color: rc, textShadow: `0 0 10px ${rc}55` }}>
                  {prev}%
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart area */}
      <div style={S.chartArea}>
        {trend.length > 0 ? (
          <>
            <div style={{ fontSize: 9, color: "#7aa2c7", letterSpacing: "0.12em", marginBottom: 10 }}>
              6-MONTH PREVALENCE TREND — {meta.label.toUpperCase()}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${active}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={meta.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={meta.color} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month"
                  tick={{ fill: "#7aa2c7", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}
                  axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#7aa2c7", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip color={meta.color} />} />
                <Area type="monotone" dataKey="value"
                  stroke={meta.color} strokeWidth={2}
                  fill={`url(#grad-${active})`}
                  dot={{ fill: meta.color, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: meta.color, stroke: "#000", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div style={S.noData}>
            <div style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 12, color: "#7aa2c7" }}>Trend data not available</div>
          </div>
        )}
      </div>

      {/* Coverage gap bars */}
      <div style={S.gapSection}>
        <div style={{ fontSize: 9, color: "#7aa2c7", letterSpacing: "0.12em", marginBottom: 10 }}>
          COVERAGE GAP OVERVIEW
        </div>
        {Object.entries(DISEASE_META).map(([key, m]) => {
          const d   = diseases[key];
          const gap = d?.gap ?? 0;
          return (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#a5c5e1" }}>
                  {m.icon} {m.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: m.color,
                  fontFamily: "'JetBrains Mono',monospace" }}>{gap}%</span>
              </div>
              <div style={{ height: 5, background: "#0b1828", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${gap}%`, background: m.color,
                  borderRadius: 3, boxShadow: `0 0 10px ${m.color}88`,
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                  animation: "barFill 1s ease both",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const S = {
  root: {
    height: "100%", display: "flex", flexDirection: "column",
    padding: "14px 16px", gap: 14, overflow: "hidden",
  },
  diseaseRow: {
    display: "flex", gap: 10, flexShrink: 0,
  },
  chartArea: {
    flex: 1, minHeight: 0, flexShrink: 0,
    background: "#060d18", border: "1px solid #1a3a5c",
    borderRadius: 12, padding: "14px",
    display: "flex", flexDirection: "column",
  },
  noData: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
  },
  gapSection: {
    background: "#060d18", border: "1px solid #1a3a5c",
    borderRadius: 12, padding: "12px 14px", flexShrink: 0,
  },
};

export default LeftPanel;
