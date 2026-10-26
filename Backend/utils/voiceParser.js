import Groq from "groq-sdk";
import { AI_MODEL } from "../config/aiConfig.js";
import { groqWithRetry } from "./groqHelper.js";

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in .env");
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

const CATEGORIES = [
  "Food", "Travel", "Rent", "Shopping", "Bills", "Health",
  "Education", "Entertainment", "Salary", "Freelance", "Investment", "Other",
];

export const parseVoiceInput = async (text) => {
  if (!text || text.trim().length < 3) {
    return { error: "Text too short to parse", success: false };
  }

  try {
    const groq = getGroqClient();
    const today = new Date().toISOString().slice(0, 10);

    const completion = await groqWithRetry(groq, {
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a voice command parser for an expense tracker app. Users speak in Hindi, English, or Hinglish (mixed). Extract structured transaction data.

Return ONLY a JSON object in this format:
{
  "success": true,
  "amount": <number>,
  "type": "expense" | "income",
  "category": "<one of: ${CATEGORIES.join(", ")}>",
  "description": "<short description>",
  "confidence": <0 to 1>
}

Rules:
- Amount: extract the number. Handle Hindi words: "paanch sau" = 500, "hazaar" = 1000, "do hazaar" = 2000, "paanch hazaar" = 5000
- Type: default "expense". If user says "salary", "income", "mila", "aaya", "kamaya" → "income"
- Category: pick from allowed list based on context
- Description: keep short, original words if possible
- If amount is missing or unclear, set "success": false and add "error": "Amount not found"
- Confidence: 0-1 based on clarity
- Today's date: ${today}

Examples:
- "500 ka petrol" → {"success": true, "amount": 500, "type": "expense", "category": "Travel", "description": "Petrol", "confidence": 0.95}
- "Swiggy order 450 rupaye" → {"success": true, "amount": 450, "type": "expense", "category": "Food", "description": "Swiggy order", "confidence": 0.95}
- "Aaj 2000 ki shopping ki" → {"success": true, "amount": 2000, "type": "expense", "category": "Shopping", "description": "Shopping", "confidence": 0.9}
- "Monthly salary 50000 mili" → {"success": true, "amount": 50000, "type": "income", "category": "Salary", "description": "Monthly salary", "confidence": 0.95}

Reply ONLY with valid JSON, no other text.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    if (!parsed.success || !parsed.amount) {
      return {
        success: false,
        error: parsed.error || "Could not extract amount from voice",
      };
    }

    return {
      success: true,
      amount: Number(parsed.amount),
      type: parsed.type === "income" ? "income" : "expense",
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      description: String(parsed.description || "").slice(0, 200),
      confidence: Math.min(Math.max(Number(parsed.confidence) || 0.7, 0), 1),
    };
  } catch (error) {
    console.error("Voice parse error:", error.message);
    return {
      success: false,
      error: "AI could not understand. Please try again.",
    };
  }
};