import mongoose from "mongoose";

const financialProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    age: { type: Number, min: 18, max: 100 },
    retirementAge: { type: Number, default: 60 },
    monthlyIncome: { type: Number, default: 0 },
    dependents: { type: Number, default: 0 },
    riskAppetite: {
      type: String,
      enum: ["conservative", "moderate", "aggressive"],
      default: "moderate",
    },
    existingSavings: { type: Number, default: 0 },
    existingInvestments: { type: Number, default: 0 },
    existingDebt: { type: Number, default: 0 },
    city: { type: String, default: "" },
    occupation: { type: String, default: "" },
    notes: { type: String, default: "", maxlength: [500, "Notes too long"] },
  },
  { timestamps: true }
);

const FinancialProfile = mongoose.model("FinancialProfile", financialProfileSchema);
export default FinancialProfile;