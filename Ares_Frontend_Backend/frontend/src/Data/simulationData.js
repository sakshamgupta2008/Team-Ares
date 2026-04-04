/**
 * utils/simulationData.js
 * ─────────────────────────────────────────────────────────────────────────────
 * FLOW A: Intervention Simulator data layer.
 *
 * TO CONNECT REAL ML ENDPOINT:
 *   Replace the body of simulateIntervention() with:
 *     const res = await fetch('/ml/simulate', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ district: districtKey, resources })
 *     });
 *     return res.json(); // must match shape: { weeks, metrics, sparklines, breakdown }
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const RESOURCE_TYPES = [
  {
    id: "mobile_clinics", label: "Mobile Clinics", icon: "🚐", color: "#00f5ff",
    maxGlobal: 8, weeklyReach: 2400, costPerUnit: 180000, effectiveness: 0.72,
  },
  {
    id: "asha_groups", label: "ASHA Worker Groups", icon: "👩‍⚕️", color: "#00ff9d",
    maxGlobal: 15, weeklyReach: 800, costPerUnit: 12000, effectiveness: 0.48,
  },
  {
    id: "screening_camps", label: "Screening Camps", icon: "⛺", color: "#ffb700",
    maxGlobal: 12, weeklyReach: 3200, costPerUnit: 45000, effectiveness: 0.61,
  },
  {
    id: "telehealth_vans", label: "Telehealth Vans", icon: "📡", color: "#bf5fff",
    maxGlobal: 5, weeklyReach: 1600, costPerUnit: 95000, effectiveness: 0.55,
  },
  {
    id: "drug_stock", label: "Nutrition / Drug Stock", icon: "💊", color: "#ff6b35",
    maxGlobal: 20, weeklyReach: 5000, costPerUnit: 8000, effectiveness: 0.34,
  },
];

export const SCENARIO_PRESETS = [
  {
    id: "ai_optimal", name: "AI Commander", description: "ML-optimised resource placement",
    icon: "⬡", color: "#00f5ff",
    resources: { mobile_clinics: 4, asha_groups: 8, screening_camps: 6, telehealth_vans: 3, drug_stock: 10 },
  },
  {
    id: "monsoon_crisis", name: "Monsoon Crisis", description: "Flood-season disruption scenario",
    icon: "🌧️", color: "#3d8dff",
    resources: { mobile_clinics: 2, asha_groups: 12, screening_camps: 3, telehealth_vans: 5, drug_stock: 15 },
  },
  {
    id: "election_push", name: "Election Year Push", description: "Maximum visibility deployment",
    icon: "📣", color: "#ffb700",
    resources: { mobile_clinics: 8, asha_groups: 15, screening_camps: 12, telehealth_vans: 5, drug_stock: 20 },
  },
  {
    id: "budget_cut", name: "Budget Cut Nightmare", description: "30% budget — triage mode",
    icon: "✂️", color: "#ff1a3c",
    resources: { mobile_clinics: 1, asha_groups: 4, screening_camps: 2, telehealth_vans: 1, drug_stock: 5 },
  },
];

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
  "ahmednagar":  { riskPct: 64, gapPct: 23, pop: 4543159 },
  "akola":       { riskPct: 55, gapPct: 9,  pop: 1818617 },
  "beed":        { riskPct: 72, gapPct: 25, pop: 2585049 },
  "gadchiroli":  { riskPct: 78, gapPct: 29, pop: 1071795 },
  "nandurbar":   { riskPct: 74, gapPct: 29, pop: 1648295 },
  "bhopal":      { riskPct: 49, gapPct: 14, pop: 2300000 },
  "indore":      { riskPct: 40, gapPct: 11, pop: 3200000 },
  "gwalior":     { riskPct: 62, gapPct: 20, pop: 2000000 },
  "bengaluru urban": { riskPct: 35, gapPct: 10, pop: 9600000 },
  "mysuru":      { riskPct: 40, gapPct: 12, pop: 3200000 },
  "raichur":     { riskPct: 73, gapPct: 26, pop: 1900000 },
};

const DEFAULT_BASELINE = { riskPct: 55, gapPct: 18, pop: 2000000 };

export function getBaselineData(districtKey) {
  const key = (districtKey || "").toLowerCase().trim();
  const b   = DISTRICT_BASELINE[key] || DEFAULT_BASELINE;
  return {
    riskPct:          b.riskPct,
    gapPct:           b.gapPct,
    populationAtRisk: Math.round(b.pop * (b.riskPct / 100)),
    populationTotal:  b.pop,
    coverageActual:   100 - b.gapPct - b.riskPct * 0.2,
    coverageExpected: 100 - b.gapPct * 0.3,
  };
}

export function simulateIntervention(districtKey, resources, totalBudget = 0) {
  const baseline = getBaselineData(districtKey);
  const { riskPct, gapPct } = baseline;

  let weeklyReach = 0, effectivenessSum = 0, totalCost = 0;
  RESOURCE_TYPES.forEach(({ id, weeklyReach: wr, costPerUnit, effectiveness }) => {
    const count = resources[id] || 0;
    weeklyReach      += count * wr;
    effectivenessSum += count * effectiveness;
    totalCost        += count * costPerUnit * 12;
  });

  if (totalBudget > 0 && totalCost > totalBudget) {
    const scale = totalBudget / totalCost;
    weeklyReach *= scale; effectivenessSum *= scale; totalCost = totalBudget;
  }

  const baseRate = Math.min(effectivenessSum * 0.018, 0.35);
  let currentGap = gapPct, currentRisk = riskPct;
  let totalScreened = 0, totalDiagnosed = 0;

  const weeks = Array.from({ length: 12 }, (_, i) => {
    const dimFactor  = 1 - (i / (12 * 1.8));
    const gapClosed  = currentGap * baseRate * dimFactor;
    currentGap       = Math.max(0, currentGap - gapClosed);
    currentRisk      = Math.max(5, currentRisk - gapClosed * 0.6);
    const screened   = Math.round(weeklyReach * (0.85 + i * 0.01));
    const diagnosed  = Math.round(screened * 0.12);
    totalScreened   += screened;
    totalDiagnosed  += diagnosed;
    return {
      week: i + 1, label: `Wk ${i + 1}`,
      gap: parseFloat(currentGap.toFixed(2)),
      risk: parseFloat(currentRisk.toFixed(2)),
      screened, diagnosed, cumulativeScreened: totalScreened, cumulativeDiagnosed: totalDiagnosed,
    };
  });

  const finalGap     = weeks[11].gap;
  const gapClosed    = gapPct - finalGap;
  const gapClosedPct = gapPct > 0 ? (gapClosed / gapPct) * 100 : 0;
  const livesImpacted = Math.round(totalDiagnosed * 0.38);
  const costPerLife   = livesImpacted > 0 ? Math.round(totalCost / livesImpacted) : 0;
  const equityGain    = parseFloat((gapClosed * 0.72).toFixed(1));

  const breakdown = RESOURCE_TYPES.map(({ id, label, color, icon, effectiveness }) => {
    const count = resources[id] || 0;
    const contribution = count > 0
      ? parseFloat(((count * effectiveness) / Math.max(effectivenessSum, 0.01) * 100).toFixed(1))
      : 0;
    return { id, label, icon, color, count, contribution };
  }).filter(r => r.count > 0);

  return {
    weeks,
    metrics: {
      totalScreened, totalDiagnosed, livesImpacted, costPerLife,
      gapClosed: parseFloat(gapClosed.toFixed(1)),
      gapClosedPct: parseFloat(gapClosedPct.toFixed(1)),
      equityGain,
      finalRisk: parseFloat(weeks[11].risk.toFixed(1)),
      totalCost,
    },
    breakdown,
    baseline,
  };
}

export function getScenarioPreset(id) {
  return SCENARIO_PRESETS.find(s => s.id === id) || SCENARIO_PRESETS[0];
}

export function calcWeeklyCost(resources) {
  return RESOURCE_TYPES.reduce((sum, { id, costPerUnit }) =>
    sum + (resources[id] || 0) * costPerUnit, 0);
}

export function formatINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}
