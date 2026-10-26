export const AI_MODEL = "openai/gpt-oss-120b";

// Optional: Different models for different tasks
export const AI_MODELS = {
  chat: "openai/gpt-oss-120b",          // Chatbot
  categorization: "openai/gpt-oss-20b", // Simple task (faster, cheaper)
  vision: "openai/gpt-oss-120b",        // Receipt parsing
  analysis: "openai/gpt-oss-120b",      // Insights, forecast, health
};