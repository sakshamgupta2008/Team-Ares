/**
 * IndiaMap.jsx — National Risk Heatmap
 * Uses curated dummy data with real variance (green/amber/red spread).
 * Supports click-drill for Maharashtra, Madhya Pradesh, Karnataka.
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";

// ── GeoJSON name → canonical key ──────────────────────────────────────────
const ALIASES = {
  "nct of delhi":              "delhi",
  "orissa":                    "odisha",
  "uttaranchal":               "uttarakhand",
  "jammu & kashmir":           "jammu and kashmir",
  "andaman & nicobar islands": "andaman and nicobar islands",
  "daman & diu":               "daman and diu",
  "dadra & nagar haveli":      "dadra and nagar haveli",
};

function getStateName(f) {
  const p = f?.properties || {};
  return p.NAME_1 || p.ST_NM || p.state || p.State || p.name || p.NAME || "";
}
function norm(raw) {
  const l = (raw || "").toLowerCase().trim();
  return ALIASES[l] ?? l;
}

// ── Curated dummy risk percentages (proper variance — not all red) ─────────
// risk_pct 0-100: <40 = green, 40-60 = amber, >60 = red
const STATE_RISK_PCT = {
  // HIGH RISK (60+)
  "uttar pradesh":          78,
  "bihar":                  75,
  "rajasthan":              71,
  "madhya pradesh":         68,
  "assam":                  67,
  "jharkhand":              72,
  "chhattisgarh":           65,
  "odisha":                 63,
  "meghalaya":              70,
  "nagaland":               73,
  "manipur":                68,
  "arunachal pradesh":      69,
  "maharashtra":            62,
  "ladakh":                 64,

  // MEDIUM RISK (40–60)
  "gujarat":                54,
  "haryana":                52,
  "west bengal":            55,
  "andhra pradesh":         49,
  "telangana":              51,
  "karnataka":              53,
  "uttarakhand":            56,
  "tripura":                50,
  "mizoram":                47,
  "sikkim":                 44,
  "jammu and kashmir":      57,
  "delhi":                  45,
  "puducherry":             43,
  "andaman and nicobar islands": 48,
  "dadra and nagar haveli": 52,
  "daman and diu":          46,

  // LOW RISK (<40)
  "kerala":                 24,
  "tamil nadu":             32,
  "goa":                    21,
  "himachal pradesh":       31,
  "punjab":                 38,
  "chandigarh":             22,
  "lakshadweep":            28,
};

const DEFAULT_PCT = 55;

// Clickable states with district drill-down
const DRILLABLE = {
  "maharashtra":    "maharashtra",
  "madhya pradesh": "madhya-pradesh",
  "karnataka":      "karnataka",
};

// ── Color interpolation ────────────────────────────────────────────────────
// ── Color interpolation ────────────────────────────────────────────────────
function lerpHex(a, b, t) {
  t = Math.max(0, Math.min(1, t));

  const h = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];

  const [ar, ag, ab] = h(a);
  const [br, bg, bb] = h(b);

  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bbVal = Math.round(ab + (bb - ab) * t);   // renamed to avoid conflict with param 'b'

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bbVal.toString(16).padStart(2, "0")}`;
}

function pctToColor(pct) {
  if (pct <= 40) {
    const t = Math.max(0, pct - 15) / 25;
    return lerpHex("#16a34a", "#15803d", t);   // bright→deep green
  }
  if (pct <= 60) {
    const t = (pct - 40) / 20;
    return lerpHex("#d97706", "#92400e", t);   // amber→deep amber
  }
  const t = Math.min((pct - 60) / 40, 1);
  return lerpHex("#dc2626", "#7f1d1d", t);     // red→deep crimson
}

function riskLabel(pct) {
  if (pct <= 40) return "low";
  if (pct <= 60) return "medium";
  return "high";
}

const INDIA_CENTER = [22.5, 82.5];
const INDIA_ZOOM   = 4.5;

const IndiaMap = ({ onStateClick }) => {
  const [geoData, setGeoData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [toast,   setToast]   = useState(null);
  const geoRef = useRef(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson")
      .then((r) => r.json())
      .then(setGeoData)
      .catch((e) => console.error("India GeoJSON error:", e));
  }, []);

  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.eachLayer((layer) => {
      const key  = norm(getStateName(layer.feature));
      const pct  = STATE_RISK_PCT[key] ?? DEFAULT_PCT;
      const isH  = hovered === key;
      const isDr = !!DRILLABLE[key];
      layer.setStyle({
        fillColor:   pctToColor(pct),
        fillOpacity: isH ? 0.95 : 0.72,
        weight:      isH ? 2.5 : isDr ? 1.8 : 0.7,
        color:       isDr ? "#00f5ff" : isH ? "#94a3b8" : "#1e293b",
      });
    });
  }, [hovered]);

  const style = useCallback((feature) => {
    const key  = norm(getStateName(feature));
    const pct  = STATE_RISK_PCT[key] ?? DEFAULT_PCT;
    const isDr = !!DRILLABLE[key];
    return {
      fillColor:   pctToColor(pct),
      fillOpacity: 0.72,
      weight:      isDr ? 1.8 : 0.7,
      color:       isDr ? "#00f5ff" : "#1e293b",
    };
  }, []);

  const onEachFeature = useCallback((feature, layer) => {
    const raw = getStateName(feature);
    const key = norm(raw);
    const dr  = DRILLABLE[key];
    layer.on({
      mouseover: () => setHovered(key),
      mouseout:  () => setHovered(null),
      click: () => {
        if (dr) {
          onStateClick(dr);
        } else {
          const label = raw.replace(/\b\w/g, c => c.toUpperCase());
          setToast(`${label} — ML data integration in progress`);
          setTimeout(() => setToast(null), 2500);
        }
      },
    });
  }, [onStateClick]);

  const hovPct   = hovered ? (STATE_RISK_PCT[hovered] ?? DEFAULT_PCT) : null;
  const hovLabel = hovered ? hovered.replace(/\b\w/g, c => c.toUpperCase()) : "";
  const isDrillable = hovered && !!DRILLABLE[hovered];

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer center={INDIA_CENTER} zoom={INDIA_ZOOM}
        style={{ height: "100%", width: "100%" }} zoomControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OSM &copy; CARTO" maxZoom={12}
        />
        {geoData && (
          <GeoJSON
            key="india-geo"
            ref={geoRef}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* Hover tooltip */}
      {hovered && hovPct !== null && (
        <div style={S.stateLabel}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f4ff" }}>{hovLabel}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>RISK SCORE</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18,
                fontWeight: 800, color: pctToColor(hovPct) }}>{hovPct}%</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>LEVEL</div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                color: { low:"#00ff9d", medium:"#ffb700", high:"#ff1a3c" }[riskLabel(hovPct)] }}>
                {riskLabel(hovPct)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, marginTop: 6,
            color: isDrillable ? "#00f5ff" : "#64748b" }}>
            {isDrillable ? "▶ Click to explore districts" : "Hover only · more states coming soon"}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Gradient scale legend */}
      <div style={S.legend}>
        <div style={{ fontSize: 8, color: "#475569", marginBottom: 5, letterSpacing: "0.1em" }}>
          RISK INTENSITY
        </div>
        <div style={{ height: 10, width: 150, borderRadius: 5,
          background: "linear-gradient(to right, #16a34a, #d97706, #dc2626, #7f1d1d)",
          boxShadow: "0 0 8px rgba(220,38,38,0.3)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", width: 150, marginTop: 3 }}>
          <span style={{ fontSize: 8, color: "#475569" }}>Low (15%)</span>
          <span style={{ fontSize: 8, color: "#475569" }}>High (95%)</span>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 2, background: "#00f5ff" }} />
            <span style={{ fontSize: 8, color: "#475569" }}>Drillable (3 states)</span>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div style={S.hint}>
        <div style={S.hintInner}>
          <span style={{ color: "#00f5ff" }}>↓</span>
          &nbsp;Click{" "}
          <span style={{ color: "#00f5ff" }}>Maharashtra</span>,{" "}
          <span style={{ color: "#ffb700" }}>MP</span> or{" "}
          <span style={{ color: "#bf5fff" }}>Karnataka</span> to drill down
        </div>
      </div>
    </div>
  );
};

const S = {
  stateLabel: {
    position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
    background: "rgba(3,6,9,0.93)", border: "1px solid #0d2035",
    borderRadius: 10, padding: "10px 18px", pointerEvents: "none",
    zIndex: 1000, textAlign: "center", backdropFilter: "blur(10px)",
    animation: "slideUp 0.2s ease both",
  },
  toast: {
    position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
    background: "rgba(3,6,9,0.95)", border: "1px solid #0d2035",
    borderRadius: 8, padding: "8px 20px", pointerEvents: "none",
    zIndex: 1000, fontSize: 12, color: "#64748b",
    animation: "slideUp 0.2s ease both",
  },
  legend: {
    position: "absolute", bottom: 24, left: 24, zIndex: 1000,
    background: "rgba(3,6,9,0.9)", border: "1px solid #0d2035",
    borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(10px)",
  },
  hint: { position: "absolute", top: 16, right: 16, zIndex: 1000 },
  hintInner: {
    background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.25)",
    borderRadius: 8, padding: "7px 13px",
    fontSize: 11, color: "#4a7090", fontFamily: "'JetBrains Mono', monospace",
    animation: "glowPulse 2.5s ease infinite",
  },
};

export default IndiaMap;
