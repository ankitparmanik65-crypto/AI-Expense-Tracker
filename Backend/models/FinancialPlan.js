import mongoose from "mongoose";

const financialPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    generatedAt: { type: Date, default: Date.now },
    aiEnhanced: { type: Boolean, default: false },
    basedOnProfile: {
      age: Number,
      retirementAge: Number,
      monthlyIncome: Number,
      riskAppetite: String,
      existingSavings: Number,
      existingInvestments: Number,
      existingDebt: Number,
    },
    overview: {
      currentStatus: String,
      targetStatus: String,
      summaryText: String,
    },
    retirementPlan: {
      targetAge: Number,
      yearsLeft: Number,
      estimatedCorpus: Number,
      currentSavings: Number,
      monthlyInvestmentNeeded: Number,
      recommendedAllocation: [
        {
          asset: String,
          percentage: Number,
          reason: String,
        },
      ],
      tips: [String],
    },
    goalPlans: [
      {
        goalName: String,
        goalType: String,
        targetAmount: Number,
        yearsToGoal: Number,
        monthlyInvestmentNeeded: Number,
        recommendation: String,
      },
    ],
    emergencyFund: {
      recommended: Number,
      current: Number,
      gap: Number,
      months: Number,
    },
    actionSteps: [
      {
        priority: String,
        title: String,
        description: String,
        timeline: String,
        icon: String,
      },
    ],
    monthlyBudgetPlan: {
      needs: Number,
      wants: Number,
      savings: Number,
      investment: Number,
    },
    warnings: [String],
  },
  { timestamps: true }
);

financialPlanSchema.index({ user: 1, generatedAt: -1 });

const FinancialPlan = mongoose.model("FinancialPlan", financialPlanSchema);
export default FinancialPlan;