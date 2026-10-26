import { parseVoiceInput } from "../utils/voiceParser.js";

// @desc    Parse voice transcript into transaction
// @route   POST /api/ai/voice/parse
// @access  Private
export const parseVoice = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Text is required" });
    }

    const result = await parseVoiceInput(text);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Parse voice error:", error);
    res.status(500).json({ message: "Failed to parse voice" });
  }
};