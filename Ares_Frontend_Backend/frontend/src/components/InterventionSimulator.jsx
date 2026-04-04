/**
 * InterventionSimulator.jsx — 12-Week Deployment War Room
 *
 * FLOW A (Intervention Simulator):
 *   • Calls simulateIntervention() from simulationData.js (dummy).
 *   • TO CONNECT REAL ML: replace simulateIntervention() with a fetch to /ml/simulate.
 *     The return shape (weeks, metrics, sparklines, breakdown) stays the same.
 *
 * Neon improvements:
 *   • Selected districts light up 2× brighter with glow + pulse.
 *   • State map shows full district risk colors.
 *   • Running simulation triggers particle burst animation.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  STATE_CONFIG, DISTRICT_RISK, DEFAULT_DISTRICT_RISK,
  pctToSolidColor, pctToRiskLabel, getDistrictName, normDistrict, C,
} from "../utils/constants.js";
import { RESOURCE_TYPES, SCENARIO_PRESETS, simulateIntervention, calcWeeklyCost, formatINR } from "../utils/simulationData.js";

// ─── Metric card ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, color, sub }) => (
  <div style={{
    background: C.card, border: `1px solid ${color}22`,
    borderRadius: 10, padding: "12px 14px", textAlign: "center",
    boxShadow: `0 0 14px ${color}0d`, transition: "all 0.3s",
  }}>
    <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color,
      fontFamily: "'JetBrains Mono',monospace",
      textShadow: `0 0 16px ${color}66`, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 9, color: "#4a7090", marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── Chart tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#030609", border: "1px solid #0d2035",
      borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 10, color: "#4a7090", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, fontWeight: 700,
          color: p.color, fontFamily: "'JetBrains Mono',monospace" }}>
          {p.name}: {p.value?.toFixed?.(1) ?? p.value}%
        </div>
      ))}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const InterventionSimulator = ({ onBack }) => {
  const [mode,             setMode]             = useState("manual");
  const [selectedState,    setSelectedState]    = useState("maharashtra");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [geoData,          setGeoData]          = useState(null);
  const [hovered,          setHovered]          = useState(null);
  const [resources,        setResources]        = useState(
    Object.fromEntries(RESOURCE_TYPES.map(r => [r.id, 0]))
  );
  const [simResult,  setSimResult]  = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [currentWeek,setCurrentWeek]= useState(1);
  const [playing,    setPlaying]    = useState(false);
  const [particles,  setParticles]  = useState([]);
  const geoRef = useRef(null);
  const playRef = useRef(null);

  const cfg = STATE_CONFIG[selectedState];

  // Load GeoJSON
  useEffect(() => {
    if (!cfg) return;
    setGeoData(null);
    fetch(cfg.url).then(r => r.json()).then(setGeoData).catch(console.error);
  }, [selectedState]);

  // Re-style map layers
  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.eachLayer(layer => {
      const key   = normDistrict(getDistrictName(layer.feature));
      const pct   = DISTRICT_RISK[key] ?? DEFAULT_DISTRICT_RISK;
      const isSel = selectedDistrict === key;
      const isH   = hovered === key;
      const color = pctToSolidColor(pct);

      layer.setStyle({
        fillColor:   color,
        fillOpacity: isSel ? 1.0 : isH ? 0.95 : 0.65,
        weight:      isSel ? 4 : isH ? 2.5 : 0.8,
        color:       isSel ? C.cyan : isH ? "#94a3b8" : "#334155",
      });
    });
  }, [hovered, selectedDistrict]);

  // Playback
  useEffect(() => {
    if (playing && simResult) {
      playRef.current = setInterval(() => {
        setCurrentWeek(prev => {
          if (prev >= 12) { setPlaying(false); return 12; }
          return prev + 1;
        });
      }, 600);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [playing, simResult]);

  const totalRes = Object.values(resources).reduce((a, b) => a + b, 0);
  const weeklyCost = calcWeeklyCost(resources);
  const weekData   = simResult?.weeks?.[currentWeek - 1] || null;

  const applyScenario = (scenario) => {
    setResources({ ...Object.fromEntries(RESOURCE_TYPES.map(r => [r.id, 0])), ...scenario.resources });
  };

  const runSimulation = useCallback(() => {
    if (!selectedDistrict) return;
    setSimRunning(true);
    setCurrentWeek(1);
    setParticles([]);

    // ── FLOW A: Connect real ML here ──────────────────────────────────────
    // Real endpoint: POST /ml/simulate with { district, resources }
    // For now using simulateIntervention() from simulationData.js:
    setTimeout(() => {
      const result = simulateIntervention(selectedDistrict, resources);
      setSimResult(result);
      setSimRunning(false);
      setPlaying(true);

      // Spawn particle burst
      setParticles(Array.from({ length: 12 }, (_, i) => ({
        id: i, x: 40 + Math.random() * 60, delay: i * 0.1,
      })));
      setTimeout(() => setParticles([]), 3000);
    }, 1200);
  }, [selectedDistrict, resources]);

  const styleFn = useCallback(feature => {
    const key   = normDistrict(getDistrictName(feature));
    const pct   = DISTRICT_RISK[key] ?? DEFAULT_DISTRICT_RISK;
    const isSel = selectedDistrict === key;
    return {
      fillColor:   pctToSolidColor(pct),
      fillOpacity: isSel ? 1.0 : 0.65,
      weight:      isSel ? 4 : 0.8,
      color:       isSel ? C.cyan : "#334155",
    };
  }, [selectedDistrict]);

  const onEachFeature = useCallback((feature, layer) => {
    const key = normDistrict(getDistrictName(feature));
    layer.on({
      mouseover: () => setHovered(key),
      mouseout:  () => setHovered(null),
      click:     () => { setSelectedDistrict(key); setSimResult(null); },
    });
  }, []);

  const baseRisk    = selectedDistrict ? (DISTRICT_RISK[selectedDistrict] ?? DEFAULT_DISTRICT_RISK) : null;
  const distLabel   = selectedDistrict?.replace(/\b\w/g, c => c.toUpperCase()) || null;

  return (
    <div style={S.root}>

      {/* ── Top Bar ── */}
      <div style={S.topBar}>
        <button onClick={onBack} style={S.backBtn}>← Back</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#e8f4ff", letterSpacing: "0.06em" }}>
            12-WEEK DEPLOYMENT <span style={{ color: C.cyan }}>WAR ROOM</span>
          </div>
          <div style={{ fontSize: 9, color: C.dim }}>DIGITAL TWIN · PREDICTIVE SIMULATION</div>
        </div>

        {/* State selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(STATE_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => { setSelectedState(key); setSelectedDistrict(null); setSimResult(null); }}
              style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: selectedState === key ? "rgba(0,245,255,0.12)" : "transparent",
                border:     selectedState === key ? "1px solid #00f5ff" : "1px solid #0d2035",
                color:      selectedState === key ? C.cyan : "#4a7090",
                cursor: "pointer",
              }}>{cfg.label}</button>
          ))}
        </div>

        {/* Mode selector */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["manual", "scenario"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: mode === m ? "rgba(0,245,255,0.12)" : "transparent",
              border:     mode === m ? "1px solid #00f5ff" : "1px solid #0d2035",
              color:      mode === m ? C.cyan : "#4a7090", cursor: "pointer",
            }}>{m === "manual" ? "Manual" : "Scenarios"}</button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={S.body}>

        {/* Left sidebar */}
        <aside style={S.leftSidebar}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em", flexShrink: 0 }}>
            RESOURCE POOL · {totalRes} UNITS · {formatINR(weeklyCost)}/WK
          </div>

          {mode === "scenario" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SCENARIO_PRESETS.map(s => (
                <button key={s.id} onClick={() => applyScenario(s)} style={{
                  background: C.card, border: `1px solid ${s.color}33`,
                  borderRadius: 10, padding: "12px", textAlign: "left", cursor: "pointer",
                  transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span style={{ fontWeight: 700, color: s.color, fontSize: 12 }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#4a7090" }}>{s.description}</div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RESOURCE_TYPES.map(res => (
                <div key={res.id} style={{
                  background: C.card,
                  border: `1px solid ${resources[res.id] > 0 ? res.color + "33" : C.nano}`,
                  borderRadius: 10, padding: "11px 12px",
                  boxShadow: resources[res.id] > 0 ? `0 0 10px ${res.color}11` : "none",
                  transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{res.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: res.color, fontSize: 11 }}>{res.label}</div>
                        <div style={{ fontSize: 9, color: C.dim }}>Max {res.maxGlobal}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => setResources(p => ({ ...p, [res.id]: Math.max(0, p[res.id] - 1) }))}
                        style={{ width: 26, height: 26, borderRadius: 6, background: C.nano, color: C.dim,
                          border: "none", cursor: "pointer", fontSize: 14 }}>−</button>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15,
                        fontWeight: 800, color: res.color, minWidth: 22, textAlign: "center" }}>
                        {resources[res.id]}
                      </span>
                      <button onClick={() => setResources(p => ({ ...p, [res.id]: Math.min(res.maxGlobal, p[res.id] + 1) }))}
                        style={{ width: 26, height: 26, borderRadius: 6, background: C.nano, color: res.color,
                          border: "none", cursor: "pointer", fontSize: 14 }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* District selector hint */}
          {!selectedDistrict && (
            <div style={{ textAlign: "center", color: C.dim, fontSize: 11,
              padding: "10px", background: "#060d18", border: "1px solid #0d2035",
              borderRadius: 8, flexShrink: 0 }}>
              ← Click a district on the map
            </div>
          )}
          {selectedDistrict && (
            <div style={{
              background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.2)",
              borderRadius: 8, padding: "10px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ fontSize: 9, color: C.dim, marginBottom: 3 }}>SELECTED</div>
              <div style={{ fontWeight: 800, color: C.cyan, fontSize: 13 }}>{distLabel}</div>
              <div style={{ fontSize: 11, color: pctToSolidColor(baseRisk), marginTop: 2,
                fontFamily: "'JetBrains Mono',monospace" }}>
                Baseline: {baseRisk}%
              </div>
            </div>
          )}

          <button onClick={runSimulation}
            disabled={simRunning || !selectedDistrict}
            style={{
              padding: "13px", borderRadius: 10, fontWeight: 800,
              fontSize: 12, letterSpacing: "0.08em", marginTop: "auto", flexShrink: 0,
              background: simRunning ? "#1a3a5c" : "rgba(0,245,255,0.1)",
              border:     `1px solid ${simRunning ? "#1a3a5c" : "#00f5ff"}`,
              color:      simRunning ? "#4a7090" : C.cyan,
              cursor:     simRunning || !selectedDistrict ? "not-allowed" : "pointer",
              opacity:    !selectedDistrict ? 0.5 : 1,
              animation:  !simRunning && selectedDistrict ? "glowPulse 2s ease infinite" : "none",
            }}>
            {simRunning ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, border: "2px solid #4a7090",
                  borderTop: `2px solid ${C.cyan}`, borderRadius: "50%",
                  animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                SIMULATING…
              </span>
            ) : "▶  RUN 12-WEEK SIMULATION"}
          </button>
        </aside>

        {/* Center map */}
        <div style={S.center}>
          {/* Particle burst */}
          {particles.map(p => (
            <div key={p.id} style={{
              position: "absolute", bottom: "30%", left: `${p.x}%`,
              width: 4, height: 4, borderRadius: "50%",
              background: C.cyan, pointerEvents: "none", zIndex: 500,
              animation: `particleFloat 1.5s ease ${p.delay}s both`,
              boxShadow: `0 0 8px ${C.cyan}`,
            }} />
          ))}

          <MapContainer
            key={selectedState}
            center={cfg?.center || [19.4, 76.5]}
            zoom={cfg?.zoom || 7}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {geoData && (
              <GeoJSON
                key={`${selectedState}-sim`}
                ref={geoRef}
                data={geoData}
                style={styleFn}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>

          {/* Map overlay hint */}
          {!selectedDistrict && (
            <div style={{ position: "absolute", top: 16, left: "50%",
              transform: "translateX(-50%)", zIndex: 1000,
              background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.25)",
              borderRadius: 8, padding: "8px 16px",
              fontSize: 11, color: "#4a7090", fontFamily: "'JetBrains Mono',monospace",
              pointerEvents: "none", animation: "glowPulse 2.5s ease infinite",
            }}>
              ◉ Click any district to select deployment target
            </div>
          )}
        </div>

        {/* Right panel */}
        <aside style={S.rightPanel}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em", flexShrink: 0 }}>
            LIVE SIMULATION METRICS
          </div>

          {!simResult ? (
            <div style={{ textAlign: "center", color: C.dim, padding: "60px 20px", flex: 1 }}>
              <div style={{ fontSize: 32, opacity: 0.2, marginBottom: 12 }}>⬡</div>
              <div style={{ fontSize: 12 }}>Select a district and deploy resources</div>
              <div style={{ fontSize: 10, marginTop: 6, color: "#0d2035" }}>Then run the simulation to see projections</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, overflowY: "auto" }}>

              {/* Week tracker */}
              <div style={{ background: C.card, border: "1px solid #0d2035",
                borderRadius: 10, padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: C.cyan, fontWeight: 700 }}>
                    WEEK {currentWeek} / 12
                  </span>
                  <button onClick={() => setPlaying(p => !p)} style={{
                    padding: "3px 10px", borderRadius: 6, fontSize: 10,
                    background: playing ? "rgba(255,183,0,0.1)" : "rgba(0,255,157,0.1)",
                    border: playing ? "1px solid #ffb70044" : "1px solid #00ff9d44",
                    color: playing ? C.amber : C.green, cursor: "pointer",
                  }}>{playing ? "⏸ Pause" : "▶ Play"}</button>
                </div>
                <input type="range" min={1} max={12} value={currentWeek}
                  onChange={e => { setCurrentWeek(+e.target.value); setPlaying(false); }}
                  style={{ width: "100%", accentColor: C.cyan }} />
              </div>

              {/* Key metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <MetricCard label="RISK NOW"    value={`${weekData?.risk?.toFixed(1) ?? "--"}%`} color={pctToSolidColor(weekData?.risk ?? 50)} />
                <MetricCard label="GAP CLOSED"  value={`${simResult.metrics.gapClosedPct?.toFixed(1) ?? "--"}%`} color={C.green} />
                <MetricCard label="SCREENED"    value={`${(weekData?.screened ?? 0).toLocaleString()}`} color={C.cyan} sub="this week" />
                <MetricCard label="DIAGNOSED"   value={`${(weekData?.diagnosed ?? 0).toLocaleString()}`} color={C.amber} sub="this week" />
              </div>

              {/* Risk trend chart */}
              <div style={{ background: C.card, border: "1px solid #0d2035", borderRadius: 10, padding: "12px" }}>
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 8, letterSpacing: "0.1em" }}>
                  RISK TRAJECTORY (12 WEEKS)
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={simResult.weeks}
                    margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.red} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.red} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label"
                      tick={{ fill: C.dim, fontSize: 8, fontFamily: "'JetBrains Mono',monospace" }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.dim, fontSize: 8 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}%`} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="risk" name="Risk %"
                      stroke={C.red} strokeWidth={2}
                      fill="url(#riskGrad)"
                      dot={false} activeDot={{ r: 4, fill: C.red, stroke: "#000" }} />
                    {/* Current week marker */}
                    {weekData && (
                      <Line type="monotone" dataKey={d => d.week === currentWeek ? d.risk : null}
                        stroke={C.cyan} strokeWidth={0} dot={{ r: 6, fill: C.cyan, stroke: "#000", strokeWidth: 2 }} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Impact Score */}
              <div style={{
                background: "linear-gradient(135deg, rgba(0,245,255,0.08), rgba(0,255,157,0.06))",
                border: "1px solid rgba(0,245,255,0.2)", borderRadius: 12, padding: "14px",
              }}>
                <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em", marginBottom: 8 }}>
                  IMPACT SCORE LEADERBOARD
                </div>
                {[
                  { label: "Lives Impacted",    value: simResult.metrics.livesImpacted?.toLocaleString(), color: C.green },
                  { label: "Total Screened",    value: simResult.metrics.totalScreened?.toLocaleString(), color: C.cyan  },
                  { label: "Cost Per Life",     value: formatINR(simResult.metrics.costPerLife),          color: C.amber },
                  { label: "Equity Gain",       value: `+${simResult.metrics.equityGain}%`,               color: C.purple},
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: "#4a7090" }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
                      fontWeight: 700, color, textShadow: `0 0 10px ${color}55` }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Resource breakdown */}
              {simResult.breakdown?.length > 0 && (
                <div style={{ background: C.card, border: "1px solid #0d2035",
                  borderRadius: 10, padding: "12px" }}>
                  <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.1em", marginBottom: 8 }}>
                    RESOURCE CONTRIBUTION
                  </div>
                  {simResult.breakdown.map(r => (
                    <div key={r.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: "#4a7090" }}>
                          {r.icon} {r.label} ×{r.count}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: r.color,
                          fontFamily: "'JetBrains Mono',monospace" }}>{r.contribution}%</span>
                      </div>
                      <div style={{ height: 4, background: "#07111f", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.contribution}%`, background: r.color,
                          borderRadius: 2, boxShadow: `0 0 5px ${r.color}55`,
                          transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const S = {
  root: {
    height: "100vh", width: "100vw", background: "#000",
    display: "flex", flexDirection: "column", overflow: "hidden",
    fontFamily: "'Syne', sans-serif",
  },
  topBar: {
    padding: "10px 20px", borderBottom: "1px solid #0d2035",
    background: "linear-gradient(to right, #000, #030609)",
    display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
  },
  backBtn: {
    background: "transparent", border: "1px solid #0d2035",
    color: "#4a7090", padding: "5px 12px", borderRadius: 8,
    fontSize: 11, fontWeight: 700, cursor: "pointer",
    fontFamily: "'JetBrains Mono',monospace",
  },
  body: { flex: 1, display: "flex", overflow: "hidden" },
  leftSidebar: {
    width: 280, background: "#030609", borderRight: "1px solid #0d2035",
    padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10,
    overflowY: "auto",
  },
  center: { flex: 1, position: "relative", overflow: "hidden" },
  rightPanel: {
    width: 320, background: "#030609", borderLeft: "1px solid #0d2035",
    padding: "16px 14px", display: "flex", flexDirection: "column",
    gap: 12, overflowY: "auto",
  },
};

export default InterventionSimulator;
