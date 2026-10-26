import { detectRecurring } from "../utils/recurringService.js";

// @desc    Detect recurring transactions
// @route   GET /api/recurring
// @access  Private
export const getRecurring = async (req, res) => {
  try {
    const data = await detectRecurring(req.user._id);
    res.json(data);
  } catch (error) {
    console.error("Recurring detection error:", error);
    res.status(500).json({ message: "Failed to detect recurring" });
  }
};