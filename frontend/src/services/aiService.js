/**
 * aiService.js — Frontend AI service for PreventiQ
 * ──────────────────────────────────────────────────────────────────────────────
 * Uses the Anthropic Claude API (claude-sonnet-4-20250514) directly from the
 * browser via the Anthropic API endpoint.
 *
 * TWO DISTINCT FLOWS:
 *   Flow A → Intervention Simulator  → call /ml/simulate (your ML endpoint)
 *   Flow B → AI Chatbot              → buildChatPayload() → getInitialReasoning()
 *
 * HOW TO SWAP ENDPOINTS:
 *   • Intervention: replace simulateIntervention() in simulationData.js with
 *     a real fetch to /ml/simulate
 *   • Chatbot:      replace buildChatPayload() in constants.js with the real
 *     JSON shape returned by your /api/v1/analyze-risk endpoint (main.py)
 * ──────────────────────────────────────────────────────────────────────────────
 */

// In-memory session store (keyed by district name)
const chatSessions = {};  // { districtKey: [{ role, content }] }
const lastPayloads  = {};  // { districtKey: cityDataObject }

const SYSTEM_PROMPT = `You are the PreventiQ Medical Intelligence Analyst — a precise, 
data-driven AI embedded in India's most advanced public health prediction platform. 
You analyze district-level NCD risk data and provide actionable, evidence-based insights.

Rules:
- NEVER use underscores in responses. Use spaces.
- Keep responses under 70 words unless explicitly asked for more detail.
- Be professional, specific, and cite the data provided.
- Suggest concrete interventions (ASHA workers, mobile clinics, PHC upgrades, etc.).
- Tone: confident analyst, not chatbot.`;

/**
 * FLOW B — AI Chatbot: Initial reasoning for a district.
 * Receives the full health data JSON (from /api/v1/analyze-risk or buildChatPayload).
 */
export async function getInitialReasoning(cityData) {
  const key = (cityData?.metadata?.city_name || "unknown").toLowerCase().trim();
  lastPayloads[key] = cityData;

  const cleanData = JSON.parse(JSON.stringify(cityData).replace(/_/g, " "));
  const userMsg = `Analyze this public health data for ${cityData.metadata.city_name}:
${JSON.stringify(cleanData, null, 2)}

Explain in 2 sentences why the risk score is ${cityData.ml_outputs.risk_score}%. 
Then suggest one specific intervention. Under 60 words total.`;

  // Initialize session
  chatSessions[key] = [{ role: "user", content: userMsg }];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: chatSessions[key],
      }),
    });

    const data = await response.json();
    const text = (data.content?.[0]?.text || "").replace(/_/g, " ");

    // Store assistant reply for multi-turn
    chatSessions[key].push({ role: "assistant", content: text });

    return { text, sessionId: key };
  } catch (err) {
    console.error("[AI] Initial reasoning error:", err);
    return { text: buildFallback(cityData), sessionId: key, isFallback: true };
  }
}

/**
 * FLOW B — AI Chatbot: Follow-up message in an existing session.
 */
export async function getFollowUpReasoning(districtName, userMessage) {
  const key = (districtName || "").toLowerCase().trim();

  // Re-init if session lost but data exists
  if (!chatSessions[key] && lastPayloads[key]) {
    await getInitialReasoning(lastPayloads[key]);
  }
  if (!chatSessions[key]) {
    return { text: "Session expired. Please re-open the district panel to restart." };
  }

  chatSessions[key].push({ role: "user", content: `${userMessage} (Be concise, no underscores)` });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: chatSessions[key],
      }),
    });

    const data = await response.json();
    const text = (data.content?.[0]?.text || "").replace(/_/g, " ");
    chatSessions[key].push({ role: "assistant", content: text });
    return { text };
  } catch (err) {
    return { text: "Network error. Please try again." };
  }
}

// ── Fallback (no API key / network error) ────────────────────────────────────
function buildFallback(cityData) {
  const drivers = (cityData.ml_outputs?.top_3_drivers || [])
    .map(d => d.replace(/_/g, " ")).join(", ");
  const level   = (cityData.ml_outputs?.risk_level || "elevated").replace(/_/g, " ");
  const city    = cityData.metadata?.city_name || "this district";
  return `PreventiQ Analysis: ${city} shows ${level} risk driven by ${drivers}. ` +
    `Prioritize mobile health unit deployment and ASHA worker training for maximum impact. ` +
    `(Simulation mode — API key not configured)`;
}
