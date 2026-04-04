import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const TABS = [
  { key: "diabetes", label: "Diabetes",      color: "#00f5ff" },
  { key: "bp",       label: "Blood Pressure", color: "#ffb700" },
  { key: "obesity",  label: "Obesity",        color: "#bf5fff" },
];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#030609", border: "1px solid #0d2035",
      borderRadius: 8, padding: "10px 14px", backdropFilter: "blur(16px)",
    }}>
      <div style={{ fontSize: 10, color: "#4a7090", marginBottom: 5,
        fontFamily: "'JetBrains Mono',monospace" }}>{label}</div>
      {payload.map((p) => p.value != null && (
        <div key={p.dataKey} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: 11, color: "#4a7090", textTransform: "capitalize" }}>{p.dataKey}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.color,
            fontFamily: "'JetBrains Mono',monospace" }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

const LeftPanel = ({ diseases = {}, onDiseaseChange }) => {
  const [active, setActive] = useState("diabetes");

  const handleTab = (key) => { setActive(key); onDiseaseChange?.(key); };
  const data   = diseases[active];
  const color  = TABS.find((t) => t.key === active)?.color || "#00f5ff";

  const chartData = useMemo(() => {
    if (!data) return [];
    const hist = data.history.map((h) => ({
      month: h.month, actual: h.actual, expected: h.expected, predicted: null,
    }));
    const lastActual = hist[hist.length - 1]?.actual ?? 0;
    const pred = data.prediction.months.map((m, i) => ({
      month: m, actual: null, expected: null, predicted: data.prediction.values[i],
    }));
    hist[hist.length - 1] = { ...hist[hist.length - 1], predicted: lastActual };
    return [...hist, ...pred];
  }, [data]);

  if (!data) return (
    <div style={{ ...S.root, alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#1a3a5c" }}>Loading…</div>
    </div>
  );

  return (
    <div style={S.root}>
      {/* Disease tabs */}
      <div style={S.tabs}>
        {TABS.map(({ key, label, color: tc }) => (
          <button key={key} onClick={() => handleTab(key)} style={{
            ...S.tab,
            background: active === key ? `${tc}10` : "transparent",
            color:       active === key ? tc : "#1a3a5c",
            borderColor: active === key ? `${tc}44` : "transparent",
            boxShadow:   active === key ? `0 0 16px ${tc}18` : "none",
          }}>{label}</button>
        ))}
      </div>

      {/* Label */}
      <div style={{ fontSize: 10, marginBottom: 10, flexShrink: 0, color: "#1a3a5c",
        textTransform: "uppercase", letterSpacing: "0.1em" }}>
        <span style={{ color }}>{data.label || active}</span>
        <span style={{ marginLeft: 8 }}>6-MONTH HISTORY + FORECAST</span>
      </div>

      {/* Chart */}
      <div style={S.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 14, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0d2035" strokeOpacity={0.8} />
            <XAxis dataKey="month"
              tick={{ fill: "#1a3a5c", fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}
              axisLine={{ stroke: "#0d2035" }} tickLine={false}
            />
            <YAxis domain={[0, 100]}
              tick={{ fill: "#1a3a5c", fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x="Jun" stroke="#122944" strokeDasharray="5 4"
              label={{ value: "NOW", fill: "#1a3a5c", fontSize: 8 }} />

            {/* Expected — dashed blue */}
            <Line type="monotone" dataKey="expected" stroke="#3d8dff" strokeWidth={1.5}
              strokeDasharray="5 3" dot={false} connectNulls={false} name="Expected" />

            {/* Actual — solid neon */}
            <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={2.5}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color, boxShadow: `0 0 8px ${color}` }}
              connectNulls={false} name="Actual"
              style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
            />

            {/* Forecast — dashed dim */}
            <Line type="monotone" dataKey="predicted" stroke={color} strokeWidth={2}
              strokeDasharray="6 4" strokeOpacity={0.45}
              dot={{ r: 3, fill: color, strokeWidth: 0, opacity: 0.45 }}
              connectNulls name="Forecast"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mini summary */}
      <div style={S.summary}>
        {[
          { label: "EXPECTED", c: "#3d8dff",  val: `${data.history[0].expected}% → ${data.history[5].expected}%` },
          { label: "ACTUAL",   c: color,       val: `${data.history[0].actual}% → ${data.history[5].actual}%` },
          { label: "FORECAST", c: "#bf5fff",   val: `→ ${data.prediction.values[5]}% by Dec` },
        ].map(({ label, c, val }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              background: `${c}15`, color: c, fontSize: 8,
              padding: "2px 6px", borderRadius: 3,
              fontFamily: "'JetBrains Mono',monospace",
            }}>{label}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: c, fontSize: 12 }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const S = {
  root: {
    height: "100%", display: "flex", flexDirection: "column",
    padding: "16px", overflow: "hidden",
  },
  tabs: { display: "flex", gap: 6, marginBottom: 12, flexShrink: 0 },
  tab: {
    border: "1px solid transparent", borderRadius: 8,
    padding: "6px 14px", fontSize: 12, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s",
    letterSpacing: "0.04em", fontFamily: "'Syne',sans-serif",
  },
  chartWrap: { flex: 1, minHeight: 0 },
  summary: {
    display: "flex", gap: 12, marginTop: 10, flexShrink: 0, flexWrap: "wrap",
  },
};

export default LeftPanel;
