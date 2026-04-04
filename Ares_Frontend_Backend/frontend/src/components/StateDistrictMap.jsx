/**
 * StateDistrictMap.jsx
 * Full-screen Leaflet district map for Madhya Pradesh and Karnataka.
 * Uses dummy risk data with proper variance (green / amber / red mix).
 * Clicking a district shows a centered floating info panel.
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";

// ── GeoJSON sources per state ─────────────────────────────────────────────
const STATE_CONFIG = {
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

// ── Dummy district risk data ──────────────────────────────────────────────
// Values are risk_pct (0-100). Deliberately mixed to avoid all-one-colour.
const DISTRICT_RISK = {
  // Madhya Pradesh
  "bhopal":          49, "indore":       40, "gwalior":     62, "jabalpur":    55,
  "ujjain":          60, "sagar":        67, "rewa":        72, "satna":       64,
  "ratlam":          57, "dewas":        51, "mandsaur":    44, "vidisha":     58,
  "raisen":          55, "hoshangabad": 48,  "narsinghpur": 50, "chhindwara":  62,
  "betul":           59, "harda":        46, "narmadapuram":47, "khandwa":     65,
  "khargone":        68, "barwani":      75, "dhar":        63, "jhabua":      79,
  "alirajpur":       81, "shajapur":     52, "agar malwa":  54, "rajgarh":     61,
  "sehore":          53, "datia":        56, "shivpuri":    63, "guna":        60,
  "ashoknagar":      58, "tikamgarh":    70, "chhatarpur":  73, "panna":       69,
  "damoh":           64, "siddhi":       71, "singrauli":   74, "neemuch":     42,
  "katni":           62, "umaria":       67, "anuppur":     70, "dindori":     73,
  "mandla":          69, "seoni":        61, "balaghat":    57, "shahdol":     66,

  // Karnataka
  "bengaluru urban": 35, "mysuru":        40, "belagavi":    58, "hubli-dharwad": 53,
  "mangaluru":       37, "davanagere":    54, "ballari":     66, "kalaburagi":   71,
  "tumakuru":        49, "shivamogga":    46, "dharwad":     44, "hassan":       42,
  "chitradurga":     57, "chikkamagaluru":41, "raichur":     73, "koppal":       69,
  "vijayapura":      61, "bagalkot":      64, "haveri":      52, "gadag":        55,
  "bidar":           63, "yadgir":        75, "chamarajanagar":43, "mandya":     38,
  "kodagu":          33, "udupi":         31, "uttara kannada":36, "dakshina kannada":34,
  "chikkaballapur":  47, "kolar":         50, "bengaluru rural":48, "ramanagara":  45,
};

const DEFAULT_RISK = 58;

// ── Dummy detail per district ─────────────────────────────────────────────
function getDummyDetail(name, pct) {
  const gap      = Math.round(pct * 0.28);
  const expected = Math.min(95, 60 + Math.round(pct * 0.1));
  const actual   = expected - gap;
  const risk     = pct > 60 ? "high" : pct > 40 ? "medium" : "low";
  const pop      = Math.round((800000 + Math.abs(name.charCodeAt(0) * 50000)) / 100000) * 100000;
  return { name, pct, gap, expected, actual, risk, pop };
}

// ── Color helpers ─────────────────────────────────────────────────────────
// ── Color helpers ─────────────────────────────────────────────────────────
function lerpHex(a, b, t) {
  t = Math.max(0, Math.min(1, t));

  const toRgb = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];

  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);

  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bVal = Math.round(ab + (bb - ab) * t);   // renamed to avoid 'b' conflict

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bVal.toString(16).padStart(2, "0")}`;
}

function pctToColor(pct) {
  if (pct <= 40) return lerpHex("#16a34a", "#15803d", Math.max(0, pct - 15) / 25);
  if (pct <= 60) return lerpHex("#d97706", "#92400e", (pct - 40) / 20);
  return lerpHex("#dc2626", "#7f1d1d", Math.min((pct - 60) / 40, 1));
}


function riskColor(r) {
  return { low:"#00ff9d", medium:"#ffb700", high:"#ff1a3c" }[r] || "#4a7090";
}

function getDistrictKey(feature) {
  const p = feature?.properties || {};
  const raw = p.NAME_2 || p.district || p.DISTRICT || p.name || p.NAME || "";
  return raw.toLowerCase().trim();
}
function getDistrictLabel(feature) {
  const p = feature?.properties || {};
  return p.NAME_2 || p.district || p.DISTRICT || p.name || p.NAME || "Unknown";
}

// ── Floating district info panel ──────────────────────────────────────────
function DistrictPanel({ detail, onClose }) {
  if (!detail) return null;
  const { name, pct, gap, expected, actual, risk, pop } = detail;
  const rc = riskColor(risk);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />
      {/* Centered panel */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 901,
        width: "min(90vw, 520px)",
        background: "linear-gradient(145deg, #07111f 0%, #030609 100%)",
        border: `1px solid ${rc}44`,
        borderRadius: 16,
        padding: "24px 28px",
        boxShadow: [
          `0 0 0 1px ${rc}18`,
          "0 24px 60px rgba(0,0,0,0.8)",
          `0 0 50px ${rc}0d`,
        ].join(", "),
        animation: "overlayIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,26,60,0.08)", border: "1px solid rgba(255,26,60,0.25)",
          color: "#ff1a3c", fontSize: 11, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.12em", marginBottom: 6 }}>
            DISTRICT HEALTH SNAPSHOT
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#e8f4ff" }}>{name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
              SIMULATED DATA
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "ML Risk Score", value: `${pct}%`, color: rc },
            { label: "Expected",      value: `${expected}%`, color: "#3d8dff" },
            { label: "Actual",        value: `${actual}%`,   color: "#00f5ff" },
            { label: "Gap",           value: `−${gap}%`,     color: rc },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, textAlign: "center",
              background: "#060d18", border: "1px solid #0d2035",
              borderRadius: 8, padding: "10px 8px" }}>
              <div style={{ fontSize: 9, color: "#1a3a5c", letterSpacing: "0.1em", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color,
                fontFamily: "'JetBrains Mono',monospace",
                textShadow: `0 0 16px ${color}66` }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Gauge bars */}
        {[
          { label: "Expected Coverage", val: expected, color: "#3d8dff" },
          { label: "Actual Coverage",   val: actual,   color: "#00f5ff" },
          { label: "ML Risk Score",     val: pct,      color: rc },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ marginBottom: 12 }}>
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
        ))}

        {/* Population */}
        <div style={{ display: "flex", justifyContent: "space-between",
          padding: "10px 0", borderTop: "1px solid #0d2035", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#1a3a5c" }}>Estimated Population</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
            fontWeight: 700, color: "#4a7090" }}>
            {(pop / 100000).toFixed(1)}L
          </span>
        </div>

        {/* ML notice */}
        <div style={{ marginTop: 14, padding: "10px 12px",
          background: "rgba(255,183,0,0.06)", border: "1px solid rgba(255,183,0,0.2)",
          borderRadius: 8, fontSize: 10, color: "#ffb700" }}>
          ⬡ Full ML analysis available for Maharashtra. MP & Karnataka simulation data
          will be live once district-level training data is integrated.
        </div>
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
const StateDistrictMap = ({ stateKey, onBack }) => {
  const cfg = STATE_CONFIG[stateKey];
  const [geoData,        setGeoData]        = useState(null);
  const [hovered,        setHovered]        = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const geoRef = useRef(null);

  useEffect(() => {
    if (!cfg) return;
    setGeoData(null);
    setSelectedDetail(null);
    fetch(cfg.url).then((r) => r.json()).then(setGeoData).catch(console.error);
  }, [cfg?.url]);

  // Re-style on hover
  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.eachLayer((layer) => {
      const key  = getDistrictKey(layer.feature);
      const pct  = DISTRICT_RISK[key] ?? DEFAULT_RISK;
      const isH  = hovered === key;
      layer.setStyle({
        fillColor:   pctToColor(pct),
        fillOpacity: isH ? 0.95 : 0.75,
        weight:      isH ? 2.5 : 0.8,
        color:       isH ? "#00f5ff" : "#1e293b",
      });
    });
  }, [hovered]);

  const style = useCallback((feature) => {
    const key = getDistrictKey(feature);
    const pct = DISTRICT_RISK[key] ?? DEFAULT_RISK;
    return { fillColor: pctToColor(pct), fillOpacity: 0.75, weight: 0.8, color: "#1e293b" };
  }, []);

  const onEachFeature = useCallback((feature, layer) => {
    const key   = getDistrictKey(feature);
    const label = getDistrictLabel(feature);
    layer.on({
      mouseover: () => setHovered(key),
      mouseout:  () => setHovered(null),
      click: () => {
        const pct = DISTRICT_RISK[key] ?? DEFAULT_RISK;
        setSelectedDetail(getDummyDetail(label, pct));
      },
    });
  }, []);

  if (!cfg) return <div style={{ color: "#1a3a5c", padding: 40 }}>State not found</div>;

  const hovPct   = hovered ? (DISTRICT_RISK[hovered] ?? DEFAULT_RISK) : null;
  const hovLabel = hovered ? hovered.replace(/\b\w/g, c => c.toUpperCase()) : "";

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        key={stateKey}
        center={cfg.center}
        zoom={cfg.zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OSM &copy; CARTO"
          maxZoom={18}
        />
        {geoData && (
          <GeoJSON
            key={`${stateKey}-geo`}
            ref={geoRef}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* State label top-left */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 800,
        background: "rgba(3,6,9,0.9)", border: "1px solid #0d2035",
        borderRadius: 10, padding: "10px 16px", backdropFilter: "blur(8px)",
      }}>
        <div style={{ fontSize: 8, color: "#1a3a5c", letterSpacing: "0.12em" }}>STATE VIEW</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#e8f4ff", marginTop: 2 }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 9, color: "#4a7090", marginTop: 4 }}>
          Simulated district risk data
        </div>
      </div>

      {/* Hover district label */}
      {hovered && hovPct !== null && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(3,6,9,0.93)", border: `1px solid ${pctToColor(hovPct)}44`,
          borderRadius: 10, padding: "10px 18px", pointerEvents: "none",
          zIndex: 1000, textAlign: "center", backdropFilter: "blur(10px)",
          animation: "slideUp 0.2s ease both",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f4ff" }}>{hovLabel}</div>
          <div style={{ fontSize: 11, color: pctToColor(hovPct), marginTop: 3,
            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
            {hovPct}% risk
          </div>
          <div style={{ fontSize: 9, color: "#1a3a5c", marginTop: 3 }}>Click for full snapshot</div>
        </div>
      )}

      {/* Color scale */}
      <div style={{
        position: "absolute", bottom: 24, left: 24, zIndex: 800,
        background: "rgba(3,6,9,0.9)", border: "1px solid #0d2035",
        borderRadius: 10, padding: "10px 14px",
      }}>
        <div style={{ fontSize: 8, color: "#475569", marginBottom: 5, letterSpacing: "0.1em" }}>
          RISK INTENSITY
        </div>
        <div style={{ height: 8, width: 140, borderRadius: 4,
          background: "linear-gradient(to right,#16a34a,#d97706,#dc2626,#7f1d1d)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", width: 140, marginTop: 3 }}>
          <span style={{ fontSize: 8, color: "#475569" }}>Low</span>
          <span style={{ fontSize: 8, color: "#475569" }}>High</span>
        </div>
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

      {/* District panel — centered floating overlay */}
      {selectedDetail && (
        <DistrictPanel
          detail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
};

export default StateDistrictMap;
