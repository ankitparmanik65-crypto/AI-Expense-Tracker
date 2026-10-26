import Goal from "../models/Goal.js";
import mongoose from "mongoose";

// @desc    Create goal
// @route   POST /api/goals
// @access  Private
export const createGoal = async (req, res) => {
  try {
    const { name, targetAmount, savedAmount = 0, deadline, icon, note } =
      req.body;

    if (!name || !targetAmount) {
      return res
        .status(400)
        .json({ message: "Name and target amount are required" });
    }

    if (Number(targetAmount) <= 0) {
      return res
        .status(400)
        .json({ message: "Target amount must be greater than 0" });
    }

    const goal = await Goal.create({
      user: req.user._id,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount) || 0,
      deadline: deadline || null,
      icon: icon || "🎯",
      note: note || "",
      completed: Number(savedAmount) >= Number(targetAmount),
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all goals
// @route   GET /api/goals
// @access  Private
export const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({
      completed: 1,
      createdAt: -1,
    });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
export const updateGoal = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const allowed = [
      "name",
      "targetAmount",
      "savedAmount",
      "deadline",
      "icon",
      "note",
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        goal[field] = req.body[field];
      }
    });

    // Auto-mark completed
    goal.completed = goal.savedAmount >= goal.targetAmount;

    const updated = await goal.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add savings to a goal (convenience endpoint)
// @route   PATCH /api/goals/:id/add
// @access  Private
export const addToGoal = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid amount required" });
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    goal.savedAmount += Number(amount);
    goal.completed = goal.savedAmount >= goal.targetAmount;

    const updated = await goal.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private
export const deleteGoal = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }

    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ message: "Goal deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};