import { generateForecast } from "../utils/forecastService.js";

// @desc    Get expense forecast
// @route   GET /api/forecast
// @access  Private
export const getForecast = async (req, res) => {
  try {
    const forecast = await generateForecast(req.user._id);
    res.json(forecast);
  } catch (error) {
    console.error("Forecast error:", error);
    res.status(500).json({ message: "Failed to generate forecast" });
  }
};