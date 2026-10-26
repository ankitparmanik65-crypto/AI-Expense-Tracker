import { detectAnomalies } from "../utils/anomalyService.js";

// @desc    Get anomalies in recent transactions
// @route   GET /api/anomalies
// @access  Private
export const getAnomalies = async (req, res) => {
  try {
    const data = await detectAnomalies(req.user._id);
    res.json(data);
  } catch (error) {
    console.error("Anomaly detection error:", error);
    res.status(500).json({ message: "Failed to detect anomalies" });
  }
};