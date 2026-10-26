/**
 * Groq API call with automatic retry on json_validate_failed
 * Ye helper har AI service me use hoga — consistent retry behavior
 */
export const groqWithRetry = async (groq, options, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await groq.chat.completions.create(options);

      // Agar JSON mode hai to validate karo
      if (options.response_format?.type === "json_object") {
        const content = completion.choices[0]?.message?.content;
        if (content) {
          try {
            JSON.parse(content); // Validate
          } catch {
            throw new Error("json_validate_failed: Invalid JSON returned");
          }
        }
      }

      return completion;
    } catch (err) {
      lastError = err;
      const isJsonError =
        err.message?.includes("json_validate_failed") ||
        err.message?.includes("json_validate");

      if (isJsonError && attempt < maxRetries) {
        console.log(
          `⏳ Groq retry ${attempt}/${maxRetries} (json_validate_failed)`
        );
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};