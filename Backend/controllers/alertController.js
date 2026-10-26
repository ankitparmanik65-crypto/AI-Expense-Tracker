import { sendTestEmail } from "../utils/emailService.js";
import User from "../models/User.js";

// @desc    Send test email
// @route   POST /api/alerts/test
// @access  Private
export const sendTest = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const result = await sendTestEmail(user);

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to send test email",
        error: result.error,
      });
    }

    res.json({
      message: "Test email sent successfully! Check your inbox.",
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle alerts on/off
// @route   PATCH /api/alerts/toggle
// @access  Private
export const toggleAlerts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.alertsEnabled = !user.alertsEnabled;
    await user.save();

    res.json({
      alertsEnabled: user.alertsEnabled,
      message: user.alertsEnabled ? "Alerts enabled" : "Alerts disabled",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get alert settings
// @route   GET /api/alerts/settings
// @access  Private
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      alertsEnabled: user.alertsEnabled,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};