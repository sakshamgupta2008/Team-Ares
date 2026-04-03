import { getInitialReasoning, getFollowUpReasoning } from './aiService.js';
 
 const mockCityData = { 
   metadata: { city_name: "Indore" }, 
   ml_outputs: { 
     risk_score: 84, 
     risk_level: "High",
     top_3_drivers: ["Low Testing", "High Population Density", "Low Staffing"] 
   }, 
   health_metrics: { 
     actual_tests_conducted: 1200, 
     expected_tests_per_month: 5000, 
     healthcare_workers_per_1000: 1.1 
   },
   simulation_state: {
     applied_intervention: "Mobile Health Units"
   }
 }; 
 
 async function runTest() { 
   try { 
     console.log("--- Testing Initial Reasoning ---"); 
     const initial = await getInitialReasoning(mockCityData); 
     console.log("AI Summary:", initial.text); 
 
     console.log("\n--- Testing Follow-up Chat ---"); 
     const followUp = await getFollowUpReasoning("Indore", "What is the biggest priority for this city?"); 
     console.log("AI Follow-up:", followUp.text); 
   } catch (err) { 
     console.error("Test Failed:", err); 
   } 
 } 
 
 runTest();
