import { GoogleGenAI, Type } from "@google/genai";
import { AIInsight, HiveData } from "../types";

export async function analyzeHiveData(feeds: HiveData[]): Promise<AIInsight> {
  // Initialize inside the function to ensure fresh API key context
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const model = "gemini-3.1-pro-preview"; // Using pro for better reasoning
  
  const dataSummary = feeds.map(f => ({
    time: f.created_at,
    temp: f.field1,
    humidity: f.field2,
    weight: f.field3
  }));

  const prompt = `
    As an expert apiarist AI, analyze the following beehive sensor data from the last few hours:
    ${JSON.stringify(dataSummary)}

    Consider these general beekeeping rules:
    - Healthy brood nest temperature is usually between 32°C and 36°C.
    - Rapid weight gain indicates a "honey flow".
    - Honey is ready for harvest when weight has stabilized at a high level and humidity is controlled.
    - Sudden weight loss might indicate swarming.
    - High humidity (>80%) for long periods might indicate poor ventilation.

    Provide a detailed analysis of hive health and harvest readiness.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              enum: ["healthy", "warning", "critical"],
              description: "The overall status of the hive"
            },
            harvestReady: {
              type: Type.BOOLEAN,
              description: "Whether the honey is ready for harvest"
            },
            summary: {
              type: Type.STRING,
              description: "A concise summary of the hive's current state"
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of recommended actions"
            },
            hiveHealthScore: {
              type: Type.NUMBER,
              description: "Health score from 0 to 100"
            }
          },
          required: ["status", "harvestReady", "summary", "recommendations", "hiveHealthScore"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from AI");
    }

    const result = JSON.parse(response.text);
    return result as AIInsight;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Return a graceful fallback
    return {
      status: 'warning',
      harvestReady: false,
      summary: "AI analysis is currently unavailable. Please monitor sensor data manually.",
      recommendations: ["Check ThingSpeak connection", "Inspect hive for physical signs of health"],
      hiveHealthScore: 50
    };
  }
}
