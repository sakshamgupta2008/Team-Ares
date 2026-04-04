/**
 * Calculates risk level based on gap between expected and actual check percentages.
 * Also generates a simulated trend/prediction score.
 */
export function calculateRisk(expected, actual) {
  const gap = expected - actual;

  // Risk score: 0–100 (higher = worse)
  const score = Math.min(100, Math.round((gap / expected) * 100));

  let level;
  if (gap <= 10) level = "low";
  else if (gap <= 20) level = "medium";
  else level = "high";

  // Simulated trend: predicts coverage in next 6 months
  // Assumes low-risk areas improve by 5%, medium by 2%, high by 0%
  const trendDelta = level === "low" ? 5 : level === "medium" ? 2 : 0;
  const predictedActual = Math.min(100, actual + trendDelta);
  const predictedGap = expected - predictedActual;
  const predictedLevel =
    predictedGap <= 10 ? "low" : predictedGap <= 20 ? "medium" : "high";

  return {
    gap,
    score,
    level,
    trend: {
      predictedActual,
      predictedGap,
      predictedLevel,
      trendDelta,
    },
  };
}
