// ─── Shared constants & pure helpers ──────────────────────────────────────────
// One source of truth for colors, risk logic, state config.
// ──────────────────────────────────────────────────────────────────────────────

// ── Solid risk colors (NO gradients — per spec) ───────────────────────────────
export const RISK_COLOR = {
  low:     "#00ff9d",   // green
  medium:  "#ffb700",   // yellow
  high:    "#ff1a3c",   // red
  default: "#1a3a5c",
};

/** Returns the solid risk color for a percentage. */
export function pctToSolidColor(pct) {
  if (pct <= 40) return RISK_COLOR.low;
  if (pct <= 60) return RISK_COLOR.medium;
  return RISK_COLOR.high;
}

/** Returns the risk label for a percentage. */
export function pctToRiskLabel(pct) {
  if (pct <= 40) return "low";
  if (pct <= 60) return "medium";
  return "high";
}

// ── Neon palette ──────────────────────────────────────────────────────────────
export const C = {
  cyan:   "#00f5ff",
  green:  "#00ff9d",
  red:    "#ff1a3c",
  amber:  "#ffb700",
  purple: "#bf5fff",
  blue:   "#3d8dff",
  dim:    "#1a3a5c",
  nano:   "#0d2035",
  card:   "#07111f",
  panel:  "#060d18",
  deep:   "#030609",
};

// ── State config (GeoJSON + map viewport) ────────────────────────────────────
export const STATE_CONFIG = {
  maharashtra: {
    label:  "Maharashtra",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/maharashtra.geojson",
    center: [19.4, 76.5],
    zoom:   7,
    hasBackend: true,   // real API data available
  },
  "madhya-pradesh": {
    label:  "Madhya Pradesh",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/madhya-pradesh.geojson",
    center: [23.5, 77.6],
    zoom:   6.8,
    hasBackend: false,
  },
  karnataka: {
    label:  "Karnataka",
    url:    "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/karnataka.geojson",
    center: [15.3, 75.7],
    zoom:   7.0,
    hasBackend: false,
  },
};

// ── Drillable states on India map ─────────────────────────────────────────────
export const INDIA_DRILLABLE = {
  "maharashtra":    "maharashtra",
  "madhya pradesh": "madhya-pradesh",
  "karnataka":      "karnataka",
};

// ── India state risk data (solid 3-tier) ──────────────────────────────────────
export const INDIA_STATE_RISK = {
  "uttar pradesh": 78, "bihar": 75, "rajasthan": 71, "madhya pradesh": 68,
  "assam": 67, "jharkhand": 72, "chhattisgarh": 65, "odisha": 63,
  "meghalaya": 70, "nagaland": 73, "manipur": 68, "arunachal pradesh": 69,
  "maharashtra": 62, "ladakh": 64,
  "gujarat": 54, "haryana": 52, "west bengal": 55, "andhra pradesh": 49,
  "telangana": 51, "karnataka": 53, "uttarakhand": 56, "tripura": 50,
  "mizoram": 47, "sikkim": 44, "jammu and kashmir": 57, "delhi": 45,
  "puducherry": 43, "andaman and nicobar islands": 48,
  "dadra and nagar haveli": 52, "daman and diu": 46,
  "kerala": 24, "tamil nadu": 32, "goa": 21, "himachal pradesh": 31,
  "punjab": 38, "chandigarh": 22, "lakshadweep": 28,
};
export const INDIA_DEFAULT_PCT = 55;

// ── District risk data (all three states) ────────────────────────────────────
export const DISTRICT_RISK = {
  // Maharashtra
  "pune": 42, "nagpur": 38, "thane": 51, "nashik": 44, "aurangabad": 58,
  "nanded": 62, "solapur": 55, "kolhapur": 36, "amravati": 47,
  "mumbai suburban": 39, "ahmednagar": 64, "akola": 55, "beed": 72,
  "bhandara": 48, "buldhana": 60, "chandrapur": 52, "dhule": 65,
  "gadchiroli": 78, "gondia": 50, "hingoli": 68, "jalgaon": 53,
  "jalna": 66, "latur": 61, "mumbai city": 34, "nandurbar": 74,
  "osmanabad": 67, "palghar": 57, "parbhani": 63, "raigad": 46,
  "ratnagiri": 44, "sangli": 41, "satara": 43, "sindhudurg": 42,
  "wardha": 49, "washim": 61, "yavatmal": 60,
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
  "bengaluru urban": 35, "mysuru": 40, "belagavi": 58,
  "hubli-dharwad": 53, "mangaluru": 37, "davanagere": 54,
  "ballari": 66, "kalaburagi": 71, "tumakuru": 49, "shivamogga": 46,
  "dharwad": 44, "hassan": 42, "chitradurga": 57, "chikkamagaluru": 41,
  "raichur": 73, "koppal": 69, "vijayapura": 61, "bagalkot": 64,
  "haveri": 52, "gadag": 55, "bidar": 63, "yadgir": 75,
  "chamarajanagar": 43, "mandya": 38, "kodagu": 33, "udupi": 31,
  "uttara kannada": 36, "dakshina kannada": 34,
  "chikkaballapur": 47, "kolar": 50, "bengaluru rural": 48, "ramanagara": 45,
};
export const DEFAULT_DISTRICT_RISK = 55;

// ── GeoJSON aliases ───────────────────────────────────────────────────────────
export const INDIA_ALIASES = {
  "nct of delhi": "delhi", "orissa": "odisha", "uttaranchal": "uttarakhand",
  "jammu & kashmir": "jammu and kashmir",
  "andaman & nicobar islands": "andaman and nicobar islands",
  "daman & diu": "daman and diu", "dadra & nagar haveli": "dadra and nagar haveli",
};

export const DISTRICT_ALIASES = {
  ahmadnagar: "ahmednagar", bid: "beed", gondiya: "gondia",
  "greater mumbai": "mumbai city", raigarh: "raigad",
};

// ── GeoJSON helpers ───────────────────────────────────────────────────────────
export function getStateName(f) {
  const p = f?.properties || {};
  return p.NAME_1 || p.ST_NM || p.state || p.State || p.name || p.NAME || "";
}

export function getDistrictName(f) {
  const p = f?.properties || {};
  return p.NAME_2 || p.district || p.DISTRICT || p.name || p.NAME || p.dtname || p.Dist_Name || "";
}

export function normState(raw) {
  const l = (raw || "").toLowerCase().trim();
  return INDIA_ALIASES[l] ?? l;
}

export function normDistrict(raw) {
  const l = (raw || "").toLowerCase().trim();
  return DISTRICT_ALIASES[l] ?? l;
}

// ── Dummy detail generator (for non-backend states) ──────────────────────────
export function getDummyDetail(name, pct) {
  const gap      = Math.round(pct * 0.28);
  const expected = Math.min(95, 60 + Math.round(pct * 0.1));
  const actual   = expected - gap;
  const risk     = pctToRiskLabel(pct);
  const pop      = Math.round((800000 + Math.abs(name.charCodeAt(0) * 50000)) / 100000) * 100000;
  return { name, pct, gap, expected, actual, risk, pop };
}

// ── Dummy AI chatbot data shape (matches aiService.js payload) ────────────────
export function buildChatPayload(districtName, stateName, pct) {
  const risk  = pctToRiskLabel(pct);
  const gap   = Math.round(pct * 0.28);
  return {
    metadata:         { city_name: districtName, state: stateName },
    ml_outputs:       {
      risk_score:   pct,
      risk_level:   risk.charAt(0).toUpperCase() + risk.slice(1),
      top_3_drivers: ["Low Testing Coverage", "Inadequate PHC Staffing", "High Population Density"],
    },
    health_metrics:   {
      actual_tests_conducted:     Math.round(5000 * (1 - gap / 100)),
      expected_tests_per_month:   5000,
      healthcare_workers_per_1000: 1.1 + (40 - pct) * 0.02,
    },
    simulation_state: { applied_intervention: "Mobile Health Units" },
  };
}
