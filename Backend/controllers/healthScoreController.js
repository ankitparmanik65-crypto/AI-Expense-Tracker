import { generateHealthScore } from "../utils/healthScoreService.js";

// @desc    Get financial health score
// @route   GET /api/health-score
// @access  Private
export const getHealthScore = async (req, res) => {
  try {
    const data = await generateHealthScore(req.user._id);
    res.json(data);
  } catch (error) {
    console.error("Health score error:", error);
    res.status(500).json({ message: "Failed to generate health score" });
  }
};