import { maharashtraDistrictData, karnatakaDistrictData, mpDistrictData } from "./data.js";

const HISTORY_MONTHS  = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const PREDICT_MONTHS  = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Each disease has slightly different expected/actual scaling
const DISEASE_PROFILE = {
  diabetes: { expScale: 1.00, actScale: 1.00, label: "Diabetes Screening" },
  bp:       { expScale: 0.97, actScale: 0.93, label: "Blood Pressure Check" },
  obesity:  { expScale: 0.90, actScale: 0.86, label: "Obesity / BMI Screening" },
};

/**
 * Builds a deterministic 6-month history + 6-month prediction for one disease.
 * Uses district index as a seed offset so each district has slightly different
 * curves — no Math.random(), so the server always returns the same data.
 */
function buildDisease(baseExp, baseAct, expScale, actScale, idx) {
  const E = Math.round(baseExp * expScale);
  const A = Math.round(baseAct * actScale);
  const gap = E - A;

  const history = HISTORY_MONTHS.map((month, i) => {
    const expected = Math.min(100, E + Math.round(i * 0.35));
    // Slight district-specific zigzag so all charts don't look identical
    const zigzag = (idx + i) % 3 === 0 ? 1 : ((idx + i) % 3 === 1 ? -1 : 0);
    const actual  = Math.min(100, Math.max(15, A + Math.round(i * 0.6) + zigzag));
    return { month, expected, actual };
  });

  const lastActual = history[5].actual;
  // High-gap districts improve slower (overwhelmed capacity)
  const rate = gap > 20 ? 0.55 : gap > 10 ? 1.1 : 1.8;

  const predValues = PREDICT_MONTHS.map((_, i) =>
    Math.min(100, Math.round(lastActual + (i + 1) * rate))
  );
  const predGap   = E - predValues[5];
  const predRisk  = predGap > 20 ? "high" : predGap > 10 ? "medium" : "low";

  return {
    history,
    prediction: { months: PREDICT_MONTHS, values: predValues, risk: predRisk },
  };
}

// ── Build the full dataset ──────────────────────────────────────────
export const districtDiseaseData = {};

function processDistricts(districts, stateName) {
  districts.forEach(
    ({ district, expected_check_percent, actual_check_percent }, idx) => {
      const key = district.toLowerCase().trim();
      const diseases = {};

      Object.entries(DISEASE_PROFILE).forEach(([name, cfg]) => {
        diseases[name] = {
          label: cfg.label,
          ...buildDisease(
            expected_check_percent,
            actual_check_percent,
            cfg.expScale,
            cfg.actScale,
            idx
          ),
        };
      });

      districtDiseaseData[key] = { district, state: stateName, diseases };
    }
  );
}

processDistricts(maharashtraDistrictData, "Maharashtra");
processDistricts(karnatakaDistrictData, "Karnataka");
processDistricts(mpDistrictData, "Madhya Pradesh");

