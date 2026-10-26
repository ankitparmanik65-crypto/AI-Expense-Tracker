import mongoose from "mongoose";

const coachPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekStart: {
      type: Date,
      required: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    // AI generated content
    greeting: String,
    summary: String,
    focusAreas: [
      {
        category: String,
        currentSpend: Number,
        targetSpend: Number,
        reason: String,
      },
    ],
    dailyMissions: [
      {
        day: String, // "Monday", "Tuesday", etc.
        mission: String,
        icon: String,
      },
    ],
    challenges: [String],
    motivationalMessage: String,
    // Meta
    basedOnData: {
      totalIncome: Number,
      totalExpense: Number,
      topCategories: [String],
      savingsRate: Number,
    },
    viewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

coachPlanSchema.index({ user: 1, weekStart: -1 });

const CoachPlan = mongoose.model("CoachPlan", coachPlanSchema);
export default CoachPlan;