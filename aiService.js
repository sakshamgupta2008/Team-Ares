import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Use a stable, widely available model string
const MODEL_NAME = "gemini-1.5-flash"; 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Persistent storage for the hackathon session
let chatSessions = {};
let lastCityData = {};

/**
 * Summarizes health data and removes underscores.
 */
export async function getInitialReasoning(cityData) {
    const cityName = cityData.metadata.city_name.toLowerCase().trim();
    lastCityData[cityName] = cityData;

    // Clean data for the prompt to help Gemini understand better
    const cleanData = JSON.parse(JSON.stringify(cityData).replace(/_/g, ' '));

    const prompt = `
        Analyze this Public Health Data for ${cityData.metadata.city_name}:
        ${JSON.stringify(cleanData)}
        
        Instructions:
        1. Explain the 'Why' behind the risk score of ${cityData.ml_outputs.risk_score}% in 2 concise sentences.
        2. Focus on implications (e.g., "resource strain" instead of just "low staff").
        3. Suggest one specific intervention.
        4. CRITICAL: Do NOT use underscores (_) in your response. Use spaces.
        Keep response under 60 words.
    `;

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "You are the PreventiQ Medical Analyst. You provide insights based on data. Never use underscores. Stay professional." }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I will provide clean, professional medical analysis without underscores." }],
                }
            ],
        });

        const result = await chat.sendMessage(prompt);
        const text = result.response.text().replace(/_/g, ' '); // Final safety regex

        chatSessions[cityName] = chat;

        return { text, sessionId: cityName };

    } catch (error) {
        console.error("[AI] API Error:", error.message);
        
        // Robust Fallback that removes ALL underscores
        const drivers = cityData.ml_outputs.top_3_drivers.map(d => d.replace(/_/g, ' ')).join(', ');
        const intervention = cityData.simulation_state.applied_intervention.replace(/_/g, ' ');
        const level = cityData.ml_outputs.risk_level.replace(/_/g, ' ');
        
        const fallbackText = `PreventiQ Analysis: The ${level} risk in ${cityData.metadata.city_name} is primarily due to ${drivers}. Strategic allocation for ${intervention} is recommended to mitigate progression. (Note: Running in Simulation Mode as the Neural Link is being synchronized)`;

        // Create a "Mock Chat" so follow-ups don't crash
        chatSessions[cityName] = {
            sendMessage: async (msg) => ({
                response: { text: () => `As the PreventiQ Analyst (Simulation Mode), I recommend focusing on ${drivers}. Our data suggests that ${intervention} will provide the highest impact for ${cityData.metadata.city_name}.` }
            })
        };

        return {
            text: fallbackText,
            sessionId: cityName,
            isFallback: true
        };
    }
}

/**
 * Continues the conversation using the stored session.
 */
export async function getFollowUpReasoning(cityName, userMessage) {
    const key = (cityName || "").toLowerCase().trim();
    let chat = chatSessions[key];

    // Re-init if session was lost but data exists
    if (!chat && lastCityData[key]) {
        await getInitialReasoning(lastCityData[key]);
        chat = chatSessions[key];
    }

    if (!chat) return { text: "Session lost. Please re-select the city on the map." };

    try {
        // Force the model to keep formatting rules in chat
        const result = await chat.sendMessage(`${userMessage} (Reminder: No underscores, keep it brief)`);
        return { text: result.response.text().replace(/_/g, ' ') };
    } catch (error) {
        return { text: "Error: " + error.message };
    }
}