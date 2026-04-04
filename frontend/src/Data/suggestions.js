/**
 * utils/suggestions.js
 * Rule-based intervention suggestions. Used by RightPanel.
 */

const SUGGESTIONS = {
  high: {
    diabetes: [
      "Deploy mobile blood-sugar screening units to weekly markets and crowded public areas",
      "Partner with local pharmacies to offer free HbA1c testing drives every month",
      "Launch targeted door-to-door screening via ASHA workers in highest-gap wards",
      "Set up dedicated diabetes awareness camps at gram panchayat level immediately",
    ],
    bp: [
      "Install blood-pressure kiosks in bus stands, markets and community halls",
      "Provide emergency training to ASHA workers on hypertension first-response",
      "Subsidise anti-hypertension medication and distribute free at all PHCs",
      "Run intensive cardiac-risk awareness campaign through local cable channels",
    ],
    obesity: [
      "Launch school-level nutrition education programs and BMI tracking registers",
      "Set up quarterly community BMI camps with free dietitian consultation",
      "Deploy mobile nutrition counsellors covering village clusters each week",
      "Partner with anganwadis for early maternal and child obesity detection",
    ],
  },
  medium: {
    diabetes: [
      "Increase screening camp frequency from quarterly to monthly across talukas",
      "Extend PHC operating hours specifically for walk-in glucose checkups",
      "Implement SMS-based annual testing reminders to registered mobile numbers",
    ],
    bp: [
      "Run bi-monthly BP monitoring drives in high-density residential areas",
      "Integrate mandatory BP readings into every PHC visit regardless of reason",
      "Target high-salt-diet and sedentary-work demographics with focused outreach",
    ],
    obesity: [
      "Promote community walking groups and evening fitness programs in parks",
      "Add nutrition counselling sessions to the regular PHC visit schedule",
      "Conduct seasonal health fairs with free BMI measurement and guidance",
    ],
  },
  low: {
    diabetes: [
      "Maintain current screening frequency with quarterly quality audits",
      "Allocate surplus capacity to document and share best practices district-wide",
      "Target the remaining unreached 5–10% with door-to-door final push",
    ],
    bp: [
      "Sustain current quarterly BP monitoring programs and widen coverage",
      "Upskill village health workers with refresher hypertension training",
      "Begin longitudinal BP data collection to support state-level research",
    ],
    obesity: [
      "Sustain wellness programs and track long-term BMI improvement outcomes",
      "Add preventive counselling modules in schools and colleges",
      "Publish this district's obesity prevention model for high-risk districts",
    ],
  },
};

export function getSuggestion(risk, disease) {
  const list =
    SUGGESTIONS[risk]?.[disease] ??
    SUGGESTIONS.medium?.diabetes ??
    [];
  return list.slice(0, 2);
}
