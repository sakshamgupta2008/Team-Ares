import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Ensure this matches the model in your main aiService.js
const TEST_MODEL = "gemini-2.5-flash"; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function checkKey() {
  console.log("--- Starting API Key Security Check ---");
  console.log("Checking for key in .env...");

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: No API key found in .env file!");
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: TEST_MODEL });
    
    // A very simple prompt to minimize token usage
    const result = await model.generateContent("Respond with the word 'Active'.");
    const responseText = result.response.text();
    
    console.log("✅ SUCCESS! API Key is valid.");
    console.log("Model Response:", responseText);

  } catch (error) {
    console.error("❌ API CALL FAILED");
    
    // Check if it's specifically a 404 (Model not found)
    if (error.status === 404) {
        console.error("Error 404: The model name '" + TEST_MODEL + "' is likely wrong or retired.");
        console.log("👉 ACTION: Try changing the model to 'gemini-3-flash-preview' or 'gemini-2.0-flash'.");
    } else {
        console.log("Status Code:", error.status);
        console.log("Details:", error.message);
    }
  }
}

checkKey();