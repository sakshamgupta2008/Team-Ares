/**
 * StateDistrictMap.jsx
 * Unified district map for Maharashtra, Madhya Pradesh, Karnataka.
 * All states use the same centered DistrictPanel overlay.
 * Maharashtra can optionally receive live districtColors + onDistrictClick from parent.
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";

// ── State config ──────────────────────────────────────────────────────────
const STATE_CONFIG = {
  maharashtra: {
    label:  "Maharashtra",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/maharashtra.geojson",
    center: [19.4, 76.5],
    zoom:   7,
  },
  "madhya-pradesh": {
    label:  "Madhya Pradesh",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/madhya-pradesh.geojson",
    center: [23.5, 77.6],
    zoom:   6.8,
  },
  karnataka: {
    label:  "Karnataka",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/karnataka.geojson",
    center: [15.3, 75.7],
    zoom:   7.0,
  },
};

// ── District risk data (all states) ──────────────────────────────────────
const DISTRICT_RISK = {
  // Maharashtra
  "pune": 42, "nagpur": 38, "thane": 51, "nashik": 44, "aurangabad": 58,
  "nanded": 62, "solapur": 55, "kolhapur": 36, "amravati": 47,
  "ahmednagar": 61, "latur": 65, "osmanabad": 68, "jalgaon": 53,
  "akola": 49, "washim": 57, "buldhana": 60, "yavatmal": 63,
  "wardha": 46, "chandrapur": 52, "gadchiroli": 72, "gondia": 58,
  "bhandara": 50, "raigad": 45, "ratnagiri": 40, "sindhudurg": 35,
  "satara": 43, "sangli": 48, "dhule": 54, "nandurbar": 71,
  "jalna": 59, "hingoli": 56, "parbhani": 64, "beed": 67,
  "mumbai city": 39, "mumbai suburban": 41, "greater mumbai": 39,

  // Madhya Pradesh
  "bhopal": 49, "indore": 40, "gwalior": 62, "jabalpur": 55,
  "ujjain": 60, "sagar": 67, "rewa": 72, "satna": 64,
  "ratlam": 57, "dewas": 51, "mandsaur": 44, "vidisha": 58,
  "raisen": 55, "hoshangabad": 48, "narsinghpur": 50, "chhindwara": 62,
  "betul": 59, "harda": 46, "khandwa": 65, "khargone": 68,
  "barwani": 75, "dhar": 63, "jhabua": 79, "alirajpur": 81,
  "shajapur": 52, "rajgarh": 61, "sehore": 53, "datia": 56,
  "shivpuri": 63, "guna": 60, "tikamgarh": 70, "chhatarpur": 73,
  "panna": 69, "damoh": 64, "siddhi": 71, "singrauli": 74,
  "neemuch": 42, "katni": 62, "umaria": 67, "anuppur": 70,
  "dindori": 73, "mandla": 69, "seoni": 61, "balaghat": 57, "shahdol": 66,

  // Karnataka
  "bengaluru urban": 35, "mysuru": 40, "belagavi": 58, "hubli-dharwad": 53,
  "mangaluru": 37, "davanagere": 54, "ballari": 66, "kalaburagi": 71,
  "tumakuru": 49, "shivamogga": 46, "dharwad": 44, "hassan": 42,
  "chitradurga": 57, "chikkamagaluru": 41, "raichur": 73, "koppal": 69,
  "vijayapura": 61, "bagalkot": 64, "haveri": 52, "gadag": 55,
  "bidar": 63, "yadgir": 75, "chamarajanagar": 43, "mandya": 38,
  "kodagu": 33, "udupi": 31, "uttara kannada": 36, "dakshina kannada": 34,
  "chikkaballapur": 47, "kolar": 50, "bengaluru rural": 48, "ramanagara": 45,
};

const DEFAULT_RISK = 55;

// ── GeoJSON alias normalization ───────────────────────────────────────────
const ALIASES = {
  ahmadnagar: "ahmednagar", bid: "beed", gondiya: "gondia",
  "greater mumbai": "mumbai city", raigarh: "raigad",
};
function normalise(raw = "") {
  const l = raw.toLowerCase().trim();
  return ALIASES[l] ?? l;
}
function getKey(feature) {
  const p = feature?.properties || {};
  const raw = p.NAME_2 || p.district || p.DISTRICT || p.name || p.NAME || "";
  return normalise(raw);
}
function getLabel(feature) {
  const p = feature?.properties || {};
  return p.NAME_2 || p.district || p.DISTRICT || p.name || p.NAME || "Unknown";
}

// ── Color helpers ─────────────────────────────────────────────────────────
function pctToSolidColor(pct) {
  if (pct <= 40) return "#16a34a";
  if (pct <= 60) return "#d97706";
  return "#dc2626";
}
function riskLabel(pct) {
  if (pct <= 40) return "low";
  if (pct <= 60) return "medium";
  return "high";
}
const RISK_NEON = { low: "#00ff9d", medium: "#ffb700", high: "#ff1a3c" };

// ── Dummy detail builder ──────────────────────────────────────────────────
function buildDetail(label, pct) {
  const gap      = Math.round(pct * 0.28);
  const expected = Math.min(95, 60 + Math.round(pct * 0.1));
  const actual   = Math.max(5, expected - gap);
  const risk     = riskLabel(pct);
  const pop      = Math.round((800000 + Math.abs(label.charCodeAt(0) * 50000)) / 100000) * 100000;
  return { label, pct, gap, expected, actual, risk, pop };
}

// ── GaugeBar ─────────────────────────────────────────────────────────────
function GaugeBar({ label, val, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#4a7090" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color,
          fontFamily: "'JetBrains Mono',monospace" }}>{val}%</span>
      </div>
      <div style={{ height: 6, background: "#0d2035", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${val}%`, background: color,
          borderRadius: 3, boxShadow: `0 0 8px ${color}66`,
          transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
    </div>
  );
}

// ── Centered District Panel (shared for ALL states) ───────────────────────
function DistrictPanel({ detail, stateName, onClose, onOpenSimulator }) {
  if (!detail) return null;
  const { label, pct, gap, expected, actual, risk, pop } = detail;
  const rc  = RISK_NEON[risk];
  const isMH = stateName === "Maharashtra";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      }} />

      {/* Strictly centered panel */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 901,
        width: "min(92vw, 540px)",
        background: "linear-gradient(145deg, #07111f 0%, #030609 100%)",
        border: `1px solid ${rc}44`,
        borderRadius: 18,
        padding: "26px 30px",
        boxShadow: [
          `0 0 0 1px ${rc}18`,
          "0 28px 70px rgba(0,0,0,0.9)",
          `0 0 60px ${rc}0d`,
          "inset 0 1px 0 rgba(255,255,255,0.04)",
        ].join(", "),
        animation: "overlayIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        {/* Corner glow */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 180, height: 180,
          background: `radial-gradient(circle at top left, ${rc}12, transparent 65%)`,
          pointerEvents: "none", borderRadius: "18px 0 0 0" }} />

        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14, zIndex: 10,
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,26,60,0.08)", border: "1px solid rgba(255,26,60,0.25)",
          color: "#ff1a3c", fontSize: 11, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: 20, position: "relative" }}>
          <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.12em", marginBottom: 6,
            fontFamily: "'JetBrains Mono',monospace" }}>
            DISTRICT HEALTH SNAPSHOT · {stateName.toUpperCase()}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#e8f4ff" }}>{label}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{
              background: `${rc}15`, border: `1px solid ${rc}44`,
              borderRadius: 6, padding: "4px 12px",
              color: rc, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: rc,
                boxShadow: `0 0 7px ${rc}`, display: "inline-block",
                animation: "dotPulse 1.5s infinite" }} />
              {risk} risk
            </span>
            <span style={{ fontSize: 9, color: "#1a3a5c", background: "#0d2035",
              borderRadius: 6, padding: "4px 10px", fontFamily: "'JetBrains Mono',monospace" }}>
              {isMH ? "LIVE + ML DATA" : "SIMULATED DATA"}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { l: "ML Risk",   v: `${pct}%`,      c: rc },
            { l: "Expected",  v: `${expected}%`, c: "#3d8dff" },
            { l: "Actual",    v: `${actual}%`,   c: "#00f5ff" },
            { l: "Gap",       v: `−${gap}%`,     c: rc },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ textAlign: "center",
              background: "#060d18", border: "1px solid #0d2035",
              borderRadius: 8, padding: "10px 6px" }}>
              <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.08em", marginBottom: 4,
                fontFamily: "'JetBrains Mono',monospace" }}>{l}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: c,
                fontFamily: "'JetBrains Mono',monospace",
                textShadow: `0 0 12px ${c}66` }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Gauge bars */}
        <GaugeBar label="Expected Coverage" val={expected} color="#3d8dff" />
        <GaugeBar label="Actual Coverage"   val={actual}   color="#00f5ff" />
        <GaugeBar label="ML Risk Score"     val={pct}      color={rc} />

        {/* Population + simulate */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 0 0", borderTop: "1px solid #0d2035", marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 9, color: "#1a3a5c" }}>EST. POPULATION</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14,
              fontWeight: 700, color: "#4a7090" }}>{(pop / 100000).toFixed(1)}L</div>
          </div>
          {onOpenSimulator && (
            <button onClick={onOpenSimulator} style={{
              padding: "8px 18px",
              background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.35)",
              borderRadius: 8, color: "#00f5ff", fontSize: 10, fontWeight: 800,
              cursor: "pointer", fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.08em",
            }}>
              ◈ Simulate Intervention
            </button>
          )}
        </div>

        {/* ML notice for non-MH states */}
        {!isMH && (
          <div style={{ marginTop: 14, padding: "10px 12px",
            background: "rgba(255,183,0,0.06)", border: "1px solid rgba(255,183,0,0.2)",
            borderRadius: 8, fontSize: 10, color: "#ffb700" }}>
            ⬡ Full ML analysis available for Maharashtra. Simulated data shown here.
          </div>
        )}
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────
/**
 * Props:
 *   stateKey          – "maharashtra" | "madhya-pradesh" | "karnataka"
 *   onBack            – () => void
 *   onOpenSimulator   – () => void  (optional)
 *   // Maharashtra live-data props (optional — falls back to dummy data):
 *   liveDistrictData  – { [districtKey]: { risk, expected, actual, gap, ml_risk_pct, ml_backed } }
 *   onDistrictClick   – (key, label) => void  (open full DistrictOverlay for MH)
 */
const StateDistrictMap = ({
  stateKey,
  onBack,
  onOpenSimulator,
  liveDistrictData = {},
  onDistrictClick,
}) => {
  const cfg = STATE_CONFIG[stateKey];
  const [geoData,        setGeoData]        = useState(null);
  const [hovered,        setHovered]        = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const geoRef = useRef(null);
  const hasLive = Object.keys(liveDistrictData).length > 0;

  useEffect(() => {
    if (!cfg) return;
    setGeoData(null);
    setSelectedDetail(null);
    fetch(cfg.url).then(r => r.json()).then(setGeoData).catch(console.error);
  }, [cfg?.url]);

  // Restyle on hover/selection
  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.eachLayer((layer) => {
      const key = getKey(layer.feature);
      const pct = hasLive && liveDistrictData[key]
        ? (liveDistrictData[key].ml_risk_pct ?? DISTRICT_RISK[key] ?? DEFAULT_RISK)
        : (DISTRICT_RISK[key] ?? DEFAULT_RISK);
      const isH = hovered === key;

      // Use live risk color if available
      const liveRisk = liveDistrictData[key]?.risk;
      const fillColor = liveRisk
        ? ({ low: "#16a34a", medium: "#d97706", high: "#dc2626" }[liveRisk] || pctToSolidColor(pct))
        : pctToSolidColor(pct);

      layer.setStyle({
        fillColor,
        fillOpacity: isH ? 0.95 : 0.75,
        weight:      isH ? 2.5 : 0.8,
        color:       isH ? "#00f5ff" : "#1e293b",
      });
    });
  }, [hovered, liveDistrictData, hasLive]);

  const style = useCallback((feature) => {
    const key  = getKey(feature);
    const pct  = DISTRICT_RISK[key] ?? DEFAULT_RISK;
    const liveRisk = liveDistrictData[key]?.risk;
    const fillColor = liveRisk
      ? ({ low: "#16a34a", medium: "#d97706", high: "#dc2626" }[liveRisk] || pctToSolidColor(pct))
      : pctToSolidColor(pct);
    return { fillColor, fillOpacity: 0.75, weight: 0.8, color: "#1e293b" };
  }, [liveDistrictData]);

  const onEachFeature = useCallback((feature, layer) => {
    const key   = getKey(feature);
    const label = getLabel(feature);
    layer.on({
      mouseover: () => setHovered(key),
      mouseout:  () => setHovered(null),
      click: () => {
        // If parent wants to handle click (Maharashtra full overlay)
        if (onDistrictClick) {
          onDistrictClick(key, label);
          return;
        }
        // Otherwise show local panel
        const livePct = liveDistrictData[key]?.ml_risk_pct;
        const pct     = livePct ?? DISTRICT_RISK[key] ?? DEFAULT_RISK;
        setSelectedDetail(buildDetail(label, pct));
      },
    });
  }, [onDistrictClick, liveDistrictData]);

  if (!cfg) return <div style={{ color: "#1a3a5c", padding: 40 }}>State not found</div>;

  const hovPct   = hovered ? (DISTRICT_RISK[hovered] ?? DEFAULT_RISK) : null;
  const hovLabel = hovered ? hovered.replace(/\b\w/g, c => c.toUpperCase()) : "";
  const hovRisk  = hovPct !== null ? riskLabel(hovPct) : null;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer key={stateKey} center={cfg.center} zoom={cfg.zoom}
        style={{ height: "100%", width: "100%" }} zoomControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OSM &copy; CARTO" maxZoom={18}
        />
        {geoData && (
          <GeoJSON
            key={`${stateKey}-${JSON.stringify(liveDistrictData).length}`}
            ref={geoRef}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* State badge top-left */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 800,
        background: "rgba(3,6,9,0.92)", border: "1px solid #0d2035",
        borderRadius: 10, padding: "10px 16px", backdropFilter: "blur(8px)",
      }}>
        <div style={{ fontSize: 8, color: "#1a3a5c", letterSpacing: "0.12em",
          fontFamily: "'JetBrains Mono',monospace" }}>STATE VIEW</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#e8f4ff", marginTop: 2 }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 9, color: "#4a7090", marginTop: 4 }}>
          {hasLive ? "Live ML data" : "Simulated district risk data"}
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && hovPct !== null && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(3,6,9,0.95)", border: `1px solid ${RISK_NEON[hovRisk]}44`,
          borderRadius: 10, padding: "10px 20px", pointerEvents: "none",
          zIndex: 1000, textAlign: "center", backdropFilter: "blur(10px)",
          animation: "slideUp 0.2s ease both",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f4ff" }}>{hovLabel}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, justifyContent: "center" }}>
            <div>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>RISK</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16,
                fontWeight: 800, color: RISK_NEON[hovRisk] }}>{hovPct}%</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>LEVEL</div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                color: RISK_NEON[hovRisk] }}>{hovRisk}</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#4a7090", marginTop: 4 }}>Click for snapshot</div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 24, left: 24, zIndex: 800,
        background: "rgba(3,6,9,0.92)", border: "1px solid #0d2035",
        borderRadius: 10, padding: "10px 14px",
      }}>
        <div style={{ fontSize: 8, color: "#475569", marginBottom: 6, letterSpacing: "0.1em" }}>
          RISK LEVEL
        </div>
        {[
          { l: "Low",    c: "#16a34a", n: "#00ff9d" },
          { l: "Medium", c: "#d97706", n: "#ffb700" },
          { l: "High",   c: "#dc2626", n: "#ff1a3c" },
        ].map(({ l, c, n }) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c,
              boxShadow: `0 0 6px ${n}66` }} />
            <span style={{ fontSize: 10, color: n, fontWeight: 600 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={{
        position: "absolute", top: 16, right: 16, zIndex: 800,
        background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.2)",
        borderRadius: 8, padding: "7px 13px",
        fontSize: 11, color: "#4a7090", fontFamily: "'JetBrains Mono',monospace",
      }}>
        ◉ Click a district for details
      </div>

      {/* Centered District Panel */}
      {selectedDetail && (
        <DistrictPanel
          detail={selectedDetail}
          stateName={cfg.label}
          onClose={() => setSelectedDetail(null)}
          onOpenSimulator={onOpenSimulator}
        />
      )}
    </div>
  );
};

export default StateDistrictMap;
