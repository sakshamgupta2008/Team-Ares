/**
 * IndiaMap.jsx — National Risk Heatmap
 * Solid 3-tier risk colors (green / yellow / red). No gradients.
 * Drillable states glow in neon cyan with pulse animation.
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import {
  INDIA_STATE_RISK, INDIA_DEFAULT_PCT, INDIA_DRILLABLE,
  pctToSolidColor, pctToRiskLabel, getStateName, normState, C,
} from "../utils/constants.js";

const INDIA_CENTER = [22.5, 82.5];
const INDIA_ZOOM   = 4.5;

const IndiaMap = ({ onStateClick }) => {
  const [geoData, setGeoData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [toast,   setToast]   = useState(null);
  const geoRef = useRef(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson")
      .then(r => r.json()).then(setGeoData)
      .catch(e => console.error("India GeoJSON:", e));
  }, []);

  // Re-style on hover
  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.eachLayer(layer => {
      const key  = normState(getStateName(layer.feature));
      const pct  = INDIA_STATE_RISK[key] ?? INDIA_DEFAULT_PCT;
      const isH  = hovered === key;
      const isDr = !!INDIA_DRILLABLE[key];
      layer.setStyle({
        fillColor:   pctToSolidColor(pct),
        fillOpacity: isH ? 0.95 : isDr ? 0.80 : 0.65,
        weight:      isH ? 3 : isDr ? 2 : 0.7,
        color:       isDr ? C.cyan : isH ? "#94a3b8" : "#1e293b",
      });
    });
  }, [hovered]);

  const style = useCallback(feature => {
    const key  = normState(getStateName(feature));
    const pct  = INDIA_STATE_RISK[key] ?? INDIA_DEFAULT_PCT;
    const isDr = !!INDIA_DRILLABLE[key];
    return {
      fillColor:   pctToSolidColor(pct),
      fillOpacity: isDr ? 0.80 : 0.65,
      weight:      isDr ? 2 : 0.7,
      color:       isDr ? C.cyan : "#1e293b",
    };
  }, []);

  const onEachFeature = useCallback((feature, layer) => {
    const raw = getStateName(feature);
    const key = normState(raw);
    const dr  = INDIA_DRILLABLE[key];
    layer.on({
      mouseover: () => setHovered(key),
      mouseout:  () => setHovered(null),
      click: () => {
        if (dr) {
          onStateClick(dr);
        } else {
          const label = raw.replace(/\b\w/g, c => c.toUpperCase());
          setToast(`${label} — District data integration in progress`);
          setTimeout(() => setToast(null), 2500);
        }
      },
    });
  }, [onStateClick]);

  const hovPct   = hovered ? (INDIA_STATE_RISK[hovered] ?? INDIA_DEFAULT_PCT) : null;
  const hovLabel = hovered ? hovered.replace(/\b\w/g, c => c.toUpperCase()) : "";
  const isDrill  = hovered && !!INDIA_DRILLABLE[hovered];
  const hovColor = hovPct !== null ? pctToSolidColor(hovPct) : C.dim;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer center={INDIA_CENTER} zoom={INDIA_ZOOM}
        style={{ height: "100%", width: "100%" }} zoomControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OSM &copy; CARTO" maxZoom={12}
        />
        {geoData && (
          <GeoJSON key="india-geo" ref={geoRef} data={geoData}
            style={style} onEachFeature={onEachFeature} />
        )}
      </MapContainer>

      {/* Hover tooltip */}
      {hovered && hovPct !== null && (
        <div style={S.tooltip}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f4ff" }}>{hovLabel}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>RISK SCORE</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20,
                fontWeight: 800, color: hovColor }}>{hovPct}%</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>LEVEL</div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: hovColor }}>
                {pctToRiskLabel(hovPct)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, marginTop: 6, color: isDrill ? C.cyan : "#64748b" }}>
            {isDrill ? "▶  Click to explore districts" : "More states coming soon"}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Legend */}
      <div style={S.legend}>
        <div style={{ fontSize: 8, color: "#475569", marginBottom: 8, letterSpacing: "0.1em" }}>
          RISK LEVEL
        </div>
        {[
          { label: "Low  (≤40%)",    color: C.green },
          { label: "Medium (41–60%)", color: C.amber },
          { label: "High  (>60%)",    color: C.red   },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color,
              boxShadow: `0 0 6px ${color}88`, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "#475569" }}>{label}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6,
          paddingTop: 8, borderTop: "1px solid #0d2035" }}>
          <div style={{ width: 14, height: 2, background: C.cyan }} />
          <span style={{ fontSize: 8, color: "#475569" }}>Drillable (3 states)</span>
        </div>
      </div>

      {/* Hint */}
      <div style={S.hint}>
        <span style={{ color: C.cyan }}>↓</span>&nbsp;
        Click{" "}<span style={{ color: C.cyan }}>Maharashtra</span>,{" "}
        <span style={{ color: C.amber }}>MP</span> or{" "}
        <span style={{ color: C.purple }}>Karnataka</span>
      </div>
    </div>
  );
};

const S = {
  tooltip: {
    position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
    background: "rgba(3,6,9,0.95)", border: "1px solid #0d2035",
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
    background: "rgba(3,6,9,0.92)", border: "1px solid #0d2035",
    borderRadius: 10, padding: "12px 14px", backdropFilter: "blur(10px)",
  },
  hint: {
    position: "absolute", top: 16, right: 16, zIndex: 1000,
    background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.25)",
    borderRadius: 8, padding: "7px 13px",
    fontSize: 11, color: "#4a7090", fontFamily: "'JetBrains Mono', monospace",
    animation: "glowPulse 2.5s ease infinite",
  },
};

export default IndiaMap;
