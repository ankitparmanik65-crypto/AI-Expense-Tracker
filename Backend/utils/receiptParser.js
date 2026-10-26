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

export const parseReceiptText = async (rawText) => {
  if (!rawText || rawText.trim().length < 5) {
    return {
      amount: null,
      date: null,
      merchant: "",
      category: "Other",
      description: "",
      confidence: 0,
      error: "Text too short to parse",
    };
  }

  try {
    const groq = getGroqClient();
    const today = new Date().toISOString().slice(0, 10);

    const completion = await groqWithRetry(groq, {
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a receipt parser. Extract structured data from raw OCR text of a receipt/bill.

Return ONLY a JSON object in this exact format:
{
  "amount": <number or null>,
  "date": "<YYYY-MM-DD or null>",
  "merchant": "<string>",
  "category": "<one of: ${CATEGORIES.join(", ")}>",
  "description": "<short description>",
  "confidence": <0 to 1>
}

Rules:
- amount: total amount paid (look for "Total", "Grand Total", "Amount", "Paid", or the largest number)
- date: format YYYY-MM-DD. If not found, use today (${today})
- merchant: shop/restaurant/service name
- category: pick best from allowed list based on merchant name and items
- description: one-line summary like "Swiggy order of ₹450"
- confidence: 0-1 based on how clear the receipt was
- If amount is not found, set it to null
- Return ONLY the JSON, no other text.`,
        },
        {
          role: "user",
          content: `OCR Text:\n\n${rawText.slice(0, 3000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content;
    const parsed = JSON.parse(responseText);

    return {
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      date: parsed.date || today,
      merchant: String(parsed.merchant || "").slice(0, 100),
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      description: String(parsed.description || "").slice(0, 200),
      confidence: Math.min(Math.max(Number(parsed.confidence) || 0.5, 0), 1),
    };
  } catch (error) {
    console.error("Receipt parsing error:", error.message);
    return {
      amount: null,
      date: null,
      merchant: "",
      category: "Other",
      description: "",
      confidence: 0,
      error: "AI parsing failed",
    };
  }
};