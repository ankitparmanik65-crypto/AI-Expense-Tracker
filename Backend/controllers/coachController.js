import {
  getCurrentPlan,
  generateWeeklyPlan,
  getPastPlans,
} from "../utils/coachService.js";

// @desc    Get current weekly plan
// @route   GET /api/coach
// @access  Private
export const getPlan = async (req, res) => {
  try {
    const plan = await getCurrentPlan(req.user._id);
    res.json(plan);
  } catch (error) {
    console.error("Get plan error:", error);
    res.status(500).json({ message: "Failed to get plan" });
  }
};

// @desc    Force regenerate plan
// @route   POST /api/coach/regenerate
// @access  Private
export const regeneratePlan = async (req, res) => {
  try {
    const plan = await generateWeeklyPlan(req.user._id, true);
    res.json(plan);
  } catch (error) {
    console.error("Regenerate error:", error);
    res.status(500).json({ message: "Failed to regenerate plan" });
  }
};

// @desc    Get past plans
// @route   GET /api/coach/history
// @access  Private
export const getHistory = async (req, res) => {
  try {
    const plans = await getPastPlans(req.user._id, 5);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};