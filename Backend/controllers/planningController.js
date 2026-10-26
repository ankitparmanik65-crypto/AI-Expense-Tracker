import FinancialProfile from "../models/FinancialProfile.js";
import {
  generateFinancialPlan,
  getLatestPlan,
  getPlanHistory,
} from "../utils/planningService.js";

// @desc    Get financial profile
// @route   GET /api/planning/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    let profile = await FinancialProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.json({
        user: req.user._id,
        age: null,
        retirementAge: 60,
        monthlyIncome: 0,
        dependents: 0,
        riskAppetite: "moderate",
        existingSavings: 0,
        existingInvestments: 0,
        existingDebt: 0,
        city: "",
        occupation: "",
        notes: "",
        isNew: true,
      });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save/Update financial profile
// @route   POST /api/planning/profile
// @access  Private
export const saveProfile = async (req, res) => {
  try {
    const {
      age,
      retirementAge,
      monthlyIncome,
      dependents,
      riskAppetite,
      existingSavings,
      existingInvestments,
      existingDebt,
      city,
      occupation,
      notes,
    } = req.body;

    if (!age || age < 18 || age > 100) {
      return res
        .status(400)
        .json({ message: "Age must be between 18 and 100" });
    }

    if (!retirementAge || Number(retirementAge) <= Number(age)) {
      return res
        .status(400)
        .json({ message: "Retirement age must be greater than current age" });
    }

    const profile = await FinancialProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        age: Number(age),
        retirementAge: Number(retirementAge),
        monthlyIncome: Number(monthlyIncome) || 0,
        dependents: Number(dependents) || 0,
        riskAppetite: riskAppetite || "moderate",
        existingSavings: Number(existingSavings) || 0,
        existingInvestments: Number(existingInvestments) || 0,
        existingDebt: Number(existingDebt) || 0,
        city: city || "",
        occupation: occupation || "",
        notes: notes || "",
      },
      { new: true, upsert: true, returnDocument: "after" }
    );

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get latest plan
// @route   GET /api/planning/plan
// @access  Private
export const getPlan = async (req, res) => {
  try {
    const plan = await getLatestPlan(req.user._id);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate new plan (formula + optional AI)
// @route   POST /api/planning/plan/generate
// @access  Private
export const generatePlan = async (req, res) => {
  try {
    const plan = await generateFinancialPlan(req.user._id);
    res.status(201).json(plan);
  } catch (error) {
    console.error("Generate plan error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get plan history
// @route   GET /api/planning/history
// @access  Private
export const getHistory = async (req, res) => {
  try {
    const plans = await getPlanHistory(req.user._id, 5);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};