import Groq from "groq-sdk";
import { AI_MODEL } from "../config/aiConfig.js";
import { groqWithRetry } from "./groqHelper.js";

const CATEGORIES = [
  "Food",
  "Travel",
  "Rent",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
];

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

export const suggestCategory = async (description, type = "expense") => {
  if (!description || description.trim() === "") {
    return { category: "Other", confidence: 0 };
  }

  try {
    const groq = getGroqClient();

    const completion = await groqWithRetry(groq, {
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expense categorizer. Given a description, respond ONLY with a JSON object like: {"category": "Food", "confidence": 0.95}.

Allowed categories: ${CATEGORIES.join(", ")}.

Rules:
- For income type, categories like Salary, Freelance, Investment are common.
- For expense type, categories like Food, Travel, Rent, Shopping, Bills, Health, Education, Entertainment are common.
- Confidence should be between 0 and 1.
- If unsure, use "Other" with confidence less than 0.6.
- Do NOT include any other text. Only the JSON.`,
        },
        {
          role: "user",
          content: `Type: ${type}\nDescription: ${description}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    const parsed = JSON.parse(response);

    const category = CATEGORIES.includes(parsed.category)
      ? parsed.category
      : "Other";

    return {
      category,
      confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
    };
  } catch (error) {
    console.error("AI categorization error:", error.message);
    return { category: "Other", confidence: 0 };
  }
};