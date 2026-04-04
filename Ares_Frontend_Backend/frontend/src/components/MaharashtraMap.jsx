import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";

const MAHARASHTRA_CENTER = [19.4, 76.5];

// GeoJSON ↔ backend name normalisation
const DISTRICT_ALIASES = {
  ahmadnagar: "ahmednagar",
  bid: "beed",
  gondiya: "gondia",
  "greater mumbai": "mumbai city",
  raigarh: "raigad",
};

function normalise(raw = "") {
  const lower = raw.toLowerCase().trim();
  return DISTRICT_ALIASES[lower] ?? lower;
}

function getDistrictName(feature) {
  const p = feature?.properties || {};
  return (
    p.NAME_2 ||
    p.district ||
    p.DISTRICT ||
    p.name ||
    p.NAME ||
    p.dtname ||
    p.Dist_Name ||
    ""
  );
}

const MaharashtraMap = ({
  districtColors = {},
  selectedDistrict = null,
  onDistrictHover = () => {},
  onDistrictLeave = () => {},
  onDistrictClick = () => {},
}) => {
  const [geoData, setGeoData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const geoRef = useRef(null);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/maharashtra.geojson"
    )
      .then((r) => r.json())
      .then(setGeoData)
      .catch((e) => console.error("Maharashtra GeoJSON error:", e));
  }, []);

  // Re-style
  useEffect(() => {
    if (!geoRef.current) return;

    geoRef.current.eachLayer((layer) => {
      const raw = getDistrictName(layer.feature);
      const key = normalise(raw);

      const isHov = hovered === key;
      const isSel = selectedDistrict === key;
      const fill = districtColors[key] || "#1e293b";

      layer.setStyle({
        fillColor: fill,
        fillOpacity: isSel ? 1 : isHov ? 0.92 : 0.72,
        weight: isSel ? 3 : isHov ? 2 : 0.8,
        color: isSel ? "#38bdf8" : isHov ? "#94a3b8" : "#334155",
      });
    });
  }, [districtColors, hovered, selectedDistrict]);

  const style = useCallback(
    (feature) => {
      const key = normalise(getDistrictName(feature));
      const fill = districtColors[key] || "#1e293b";
      const isSel = selectedDistrict === key;

      return {
        fillColor: fill,
        fillOpacity: isSel ? 1 : 0.72,
        weight: isSel ? 3 : 0.8,
        color: isSel ? "#38bdf8" : "#334155",
      };
    },
    [districtColors, selectedDistrict]
  );

  const onEachFeature = useCallback(
    (feature, layer) => {
      const raw = getDistrictName(feature);
      const key = normalise(raw);

      layer.on({
        mouseover: () => {
          setHovered(key);
          onDistrictHover({ id: key, name: raw || key });
        },
        mouseout: () => {
          setHovered(null);
          onDistrictLeave();
        },
        click: () => {
          onDistrictClick(key, raw || key);
        },
      });
    },
    [onDistrictHover, onDistrictLeave, onDistrictClick]
  );

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        zIndex: 0, // 🔥 forces map BELOW overlay
      }}
    >
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={7}
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
            key={JSON.stringify(districtColors) + selectedDistrict}
            ref={geoRef}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MaharashtraMap;