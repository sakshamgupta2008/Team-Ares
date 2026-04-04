/**
 * simulationData.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates fully deterministic dummy data for the 12-week Intervention
 * Simulator. When the real ML pipeline is ready, replace the functions below
 * with API calls to /ml/simulate and swap the return shapes.
 *
 * Shape contract (stays the same after ML integration):
 *
 *   simulateIntervention(districtKey, resources, budgetConstraint)
 *     → { weeks, metrics, sparklines, breakdown }
 *
 *   getBaselineData(districtKey)
 *     → { riskPct, gapPct, populationAtRisk, coverageActual, coverageExpected }
 *
 *   getScenarioPreset(scenarioId)
 *     → { name, description, resources, budgetMultiplier }
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Resource types (matches ResourcePool UI) ──────────────────────────────────
export const RESOURCE_TYPES = [
  {
    id:      "mobile_clinics",
    label:   "Mobile Clinics",
    icon:    "🚐",
    color:   "#00f5ff",
    maxGlobal: 8,
    weeklyReach:  2400,   // people screened per unit per week
    costPerUnit:  180000, // INR per week
    effectiveness: 0.72,  // gap closure rate per unit
  },
  {
    id:      "asha_groups",
    label:   "ASHA Worker Groups",
    icon:    "👩‍⚕️",
    color:   "#00ff9d",
    maxGlobal: 15,
    weeklyReach:  800,
    costPerUnit:  12000,
    effectiveness: 0.48,
  },
  {
    id:      "screening_camps",
    label:   "Screening Camps",
    icon:    "⛺",
    color:   "#ffb700",
    maxGlobal: 12,
    weeklyReach:  3200,
    costPerUnit:  45000,
    effectiveness: 0.61,
  },
  {
    id:      "telehealth_vans",
    label:   "Telehealth Vans",
    icon:    "📡",
    color:   "#bf5fff",
    maxGlobal: 5,
    weeklyReach:  1600,
    costPerUnit:  95000,
    effectiveness: 0.55,
  },
  {
    id:      "drug_stock",
    label:   "Nutrition / Drug Stock",
    icon:    "💊",
    color:   "#ff6b35",
    maxGlobal: 20,
    weeklyReach:  5000,
    costPerUnit:  8000,
    effectiveness: 0.34,
  },
];

// ── Scenario presets ─────────────────────────────────────────────────────────
export const SCENARIO_PRESETS = [
  {
    id:          "ai_optimal",
    name:        "AI Commander",
    description: "ML-optimised resource placement",
    icon:        "⬡",
    color:       "#00f5ff",
    resources:   { mobile_clinics: 4, asha_groups: 8, screening_camps: 6, telehealth_vans: 3, drug_stock: 10 },
    budgetMultiplier: 1.0,
  },
  {
    id:          "monsoon_crisis",
    name:        "Monsoon Crisis",
    description: "Flood-season disruption scenario",
    icon:        "🌧️",
    color:       "#3d8dff",
    resources:   { mobile_clinics: 2, asha_groups: 12, screening_camps: 3, telehealth_vans: 5, drug_stock: 15 },
    budgetMultiplier: 0.7,
  },
  {
    id:          "election_push",
    name:        "Election Year Push",
    description: "Maximum visibility, high-impact deployment",
    icon:        "📣",
    color:       "#ffb700",
    resources:   { mobile_clinics: 8, asha_groups: 15, screening_camps: 12, telehealth_vans: 5, drug_stock: 20 },
    budgetMultiplier: 1.8,
  },
  {
    id:          "budget_cut",
    name:        "Budget Cut Nightmare",
    description: "30% budget — triage mode",
    icon:        "✂️",
    color:       "#ff1a3c",
    resources:   { mobile_clinics: 1, asha_groups: 4, screening_camps: 2, telehealth_vans: 1, drug_stock: 5 },
    budgetMultiplier: 0.3,
  },
];

// ── Baseline risk data per district (deterministic) ──────────────────────────
const DISTRICT_BASELINE = {
  "pune":            { riskPct: 42, gapPct: 11, pop: 9429408 },
  "nagpur":          { riskPct: 38, gapPct: 12, pop: 4653570 },
  "thane":           { riskPct: 51, gapPct: 15, pop: 11060148 },
  "nashik":          { riskPct: 44, gapPct: 14, pop: 6107187 },
  "aurangabad":      { riskPct: 58, gapPct: 24, pop: 3701282 },
  "nanded":          { riskPct: 62, gapPct: 23, pop: 3361292 },
  "solapur":         { riskPct: 55, gapPct: 19, pop: 4317756 },
  "kolhapur":        { riskPct: 36, gapPct: 11, pop: 3876001 },
  "amravati":        { riskPct: 47, gapPct: 14, pop: 2888445 },
  "mumbai suburban": { riskPct: 39, gapPct: 13, pop: 9356962 },
  // Simulated-only districts (no ML data)
  "ahmednagar":  { riskPct: 64, gapPct: 23, pop: 4543159 },
  "akola":       { riskPct: 55, gapPct: 9,  pop: 1818617 },
  "beed":        { riskPct: 72, gapPct: 25, pop: 2585049 },
  "bhandara":    { riskPct: 48, gapPct: 8,  pop: 1200334 },
  "buldhana":    { riskPct: 60, gapPct: 21, pop: 2586258 },
  "chandrapur":  { riskPct: 52, gapPct: 13, pop: 2194262 },
  "dhule":       { riskPct: 65, gapPct: 23, pop: 2050862 },
  "gadchiroli":  { riskPct: 78, gapPct: 29, pop: 1071795 },
  "gondia":      { riskPct: 50, gapPct: 11, pop: 1322507 },
  "hingoli":     { riskPct: 68, gapPct: 24, pop: 1177345 },
  "jalgaon":     { riskPct: 53, gapPct: 15, pop: 4229917 },
  "jalna":       { riskPct: 66, gapPct: 24, pop: 1959046 },
  "latur":       { riskPct: 61, gapPct: 21, pop: 2454196 },
  "mumbai city": { riskPct: 34, gapPct: 11, pop: 3085411 },
  "nandurbar":   { riskPct: 74, gapPct: 29, pop: 1648295 },
  "osmanabad":   { riskPct: 67, gapPct: 24, pop: 1657576 },
  "palghar":     { riskPct: 57, gapPct: 20, pop: 2990116 },
  "parbhani":    { riskPct: 63, gapPct: 22, pop: 1835982 },
  "raigad":      { riskPct: 46, gapPct: 14, pop: 2634200 },
  "ratnagiri":   { riskPct: 44, gapPct: 14, pop: 1615069 },
  "sangli":      { riskPct: 41, gapPct: 13, pop: 2822143 },
  "satara":      { riskPct: 43, gapPct: 13, pop: 3003741 },
  "sindhudurg":  { riskPct: 42, gapPct: 11, pop: 848868  },
  "wardha":      { riskPct: 49, gapPct: 11, pop: 1300774 },
  "washim":      { riskPct: 61, gapPct: 18, pop: 1196714 },
  "yavatmal":    { riskPct: 60, gapPct: 19, pop: 2772348 },
};

const DEFAULT_BASELINE = { riskPct: 55, gapPct: 18, pop: 2000000 };

// ── Core helpers ──────────────────────────────────────────────────────────────

/** Returns the baseline for a district key (lowercase, trimmed). */
export function getBaselineData(districtKey) {
  const key = (districtKey || "").toLowerCase().trim();
  const b   = DISTRICT_BASELINE[key] || DEFAULT_BASELINE;
  return {
    riskPct:           b.riskPct,
    gapPct:            b.gapPct,
    populationAtRisk:  Math.round(b.pop * (b.riskPct / 100)),
    populationTotal:   b.pop,
    coverageActual:    100 - b.gapPct - b.riskPct * 0.2,
    coverageExpected:  100 - b.gapPct * 0.3,
  };
}

/**
 * Simulate 12 weeks of resource deployment for a district.
 *
 * @param {string}  districtKey   — lowercase district name
 * @param {Object}  resources     — { mobile_clinics: N, asha_groups: N, … }
 * @param {number}  totalBudget   — INR budget cap (0 = uncapped)
 * @returns {{ weeks, metrics, sparklines, breakdown, totalCost }}
 */
export function simulateIntervention(districtKey, resources, totalBudget = 0) {
  const baseline = getBaselineData(districtKey);
  const { riskPct, gapPct, populationAtRisk } = baseline;

  // ── Compute weekly effectiveness multiplier from deployed resources ─────
  let weeklyReach       = 0;
  let effectivenessSum  = 0;
  let totalCost         = 0;

  RESOURCE_TYPES.forEach(({ id, weeklyReach: wr, costPerUnit, effectiveness }) => {
    const count = resources[id] || 0;
    weeklyReach      += count * wr;
    effectivenessSum += count * effectiveness;
    totalCost        += count * costPerUnit * 12; // 12 weeks
  });

  // Budget cap
  if (totalBudget > 0 && totalCost > totalBudget) {
    const scale = totalBudget / totalCost;
    weeklyReach      *= scale;
    effectivenessSum *= scale;
    totalCost         = totalBudget;
  }

  // Gap closure rate per week (diminishing returns via log curve)
  const baseRate      = Math.min(effectivenessSum * 0.018, 0.35); // max 35% gap/week
  const WEEKS         = 12;
  const weekLabels    = Array.from({ length: WEEKS }, (_, i) => `Wk ${i + 1}`);

  // ── Build week-by-week time series ────────────────────────────────────────
  let currentGap      = gapPct;
  let currentRisk     = riskPct;
  let totalScreened   = 0;
  let totalDiagnosed  = 0;

  const weeks = weekLabels.map((wk, i) => {
    // Diminishing returns: most improvement in first 6 weeks
    const dimFactor   = 1 - (i / (WEEKS * 1.8));
    const gapClosed   = currentGap * baseRate * dimFactor;
    currentGap        = Math.max(0, currentGap - gapClosed);
    currentRisk       = Math.max(5, currentRisk - (gapClosed * 0.6));

    const screened    = Math.round(weeklyReach * (0.85 + i * 0.01));
    const diagnosed   = Math.round(screened * 0.12);
    totalScreened    += screened;
    totalDiagnosed   += diagnosed;

    return {
      week:          i + 1,
      label:         wk,
      gap:           parseFloat(currentGap.toFixed(2)),
      risk:          parseFloat(currentRisk.toFixed(2)),
      screened:      screened,
      diagnosed:     diagnosed,
      cumulativeScreened: totalScreened,
      cumulativeDiagnosed: totalDiagnosed,
    };
  });

  const finalGap      = weeks[WEEKS - 1].gap;
  const gapClosed     = gapPct - finalGap;
  const gapClosedPct  = gapPct > 0 ? (gapClosed / gapPct) * 100 : 0;
  const livesImpacted = Math.round(totalDiagnosed * 0.38); // 38% go on to treatment
  const costPerLife   = livesImpacted > 0 ? Math.round(totalCost / livesImpacted) : 0;

  // Equity gain: how much coverage improved for bottom-quintile population
  const equityGain    = parseFloat((gapClosed * 0.72).toFixed(1));

  // ── Sparklines (disease-specific) ─────────────────────────────────────────
  const sparklines = {
    diabetes: weeks.map((w) => ({
      week:  w.week,
      value: parseFloat((baseline.riskPct * 0.35 - w.gap * 0.4 + w.week * 0.5).toFixed(1)),
    })),
    bp: weeks.map((w) => ({
      week:  w.week,
      value: parseFloat((baseline.riskPct * 0.28 - w.gap * 0.35 + w.week * 0.4).toFixed(1)),
    })),
    obesity: weeks.map((w) => ({
      week:  w.week,
      value: parseFloat((baseline.riskPct * 0.18 - w.gap * 0.22 + w.week * 0.25).toFixed(1)),
    })),
  };

  // ── Resource contribution breakdown ───────────────────────────────────────
  const breakdown = RESOURCE_TYPES.map(({ id, label, color, icon, weeklyReach: wr, effectiveness }) => {
    const count  = resources[id] || 0;
    const contribution = count > 0
      ? parseFloat(((count * effectiveness) / Math.max(effectivenessSum, 0.01) * 100).toFixed(1))
      : 0;
    return { id, label, icon, color, count, contribution };
  }).filter((r) => r.count > 0);

  return {
    weeks,
    metrics: {
      totalScreened,
      totalDiagnosed,
      livesImpacted,
      costPerLife,
      gapClosed:       parseFloat(gapClosed.toFixed(1)),
      gapClosedPct:    parseFloat(gapClosedPct.toFixed(1)),
      equityGain,
      finalRisk:       parseFloat(weeks[WEEKS - 1].risk.toFixed(1)),
      totalCost,
      mlConfidence:    68, // PLACEHOLDER — will come from ML service
    },
    sparklines,
    breakdown,
    baseline,
  };
}

/** Returns a scenario preset by id. */
export function getScenarioPreset(scenarioId) {
  return SCENARIO_PRESETS.find((s) => s.id === scenarioId) || SCENARIO_PRESETS[0];
}

/** Returns total weekly cost for a resource allocation. */
export function calcWeeklyCost(resources) {
  return RESOURCE_TYPES.reduce((sum, { id, costPerUnit }) => {
    return sum + (resources[id] || 0) * costPerUnit;
  }, 0);
}

/** Formats large INR numbers. */
export function formatINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}
