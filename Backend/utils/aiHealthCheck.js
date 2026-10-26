import Groq from "groq-sdk";
import { AI_MODEL } from "../config/aiConfig.js";

/**
 * Server start hone pe AI availability check karo
 */
export const checkAIAvailability = async () => {
  console.log("\n🔍 Checking AI availability...");

  // Step 1: API key check
  if (!process.env.GROQ_API_KEY) {
    console.log("❌ AI Not Available: GROQ_API_KEY missing in .env\n");
    return false;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const start = Date.now();

    // Simple text response — JSON mode flaky hai health check me
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: OK",
        },
      ],
      temperature: 0,
      max_tokens: 100,
    });

    const latency = Date.now() - start;
    const response = completion.choices[0]?.message?.content;

    if (response && response.trim().length > 0) {
      console.log(`✅ AI Available: Groq (${AI_MODEL}) — ${latency}ms\n`);
      return true;
    } else {
      console.log("❌ AI Not Available: Empty response from Groq\n");
      return false;
    }
  } catch (error) {
    // Specific error types handle karo
    const msg = error.message || "";

    if (msg.includes("401") || msg.includes("Unauthorized")) {
      console.log("❌ AI Not Available: Invalid GROQ_API_KEY\n");
    } else if (msg.includes("429") || msg.includes("rate limit")) {
      console.log("⚠️  AI Available but Rate Limited: Groq quota exceeded\n");
    } else if (msg.includes("model_not_found")) {
      console.log("❌ AI Not Available: Model not found on Groq\n");
    } else if (
      msg.includes("ENOTFOUND") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("network")
    ) {
      console.log("❌ AI Not Available: Network error (internet check karo)\n");
    } else {
      console.log(`❌ AI Not Available: ${msg}\n`);
    }
    return false;
  }
};