import { suggestCategory } from "../utils/aiService.js";

// @desc    Suggest category based on description
// @route   POST /api/ai/categorize
// @access  Private
export const categorize = async (req, res) => {
  try {
    const { description, type } = req.body;

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    const result = await suggestCategory(description, type);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};