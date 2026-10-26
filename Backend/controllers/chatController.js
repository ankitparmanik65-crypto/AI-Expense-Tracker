import { chatWithAI } from "../utils/chatService.js";

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Private
export const chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message is required" });
    }

    const result = await chatWithAI(message, req.user._id);

    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      message: "AI assistant is unavailable right now. Please try again.",
    });
  }
};