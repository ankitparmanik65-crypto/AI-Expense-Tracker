import Insight from "../models/Insight.js";
import { generateInsights } from "../utils/insightService.js";

// @desc    Get insights (cached for 24h, else regenerate)
// @route   GET /api/insights
// @access  Private
export const getInsights = async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true";

    // Cache check - 24 hours
    if (!forceRefresh) {
      const cached = await Insight.findOne({ user: req.user._id }).sort({
        generatedAt: -1,
      });

      if (
        cached &&
        Date.now() - new Date(cached.generatedAt).getTime() < 24 * 60 * 60 * 1000
      ) {
        return res.json({
          insights: cached.insights,
          generatedAt: cached.generatedAt,
          cached: true,
        });
      }
    }

    // Naye insights generate karo
    const insights = await generateInsights(req.user._id);

    // Save karo
    const saved = await Insight.create({
      user: req.user._id,
      insights,
    });

    res.json({
      insights: saved.insights,
      generatedAt: saved.generatedAt,
      cached: false,
    });
  } catch (error) {
    console.error("Get insights error:", error);
    res.status(500).json({ message: "Failed to generate insights" });
  }
};