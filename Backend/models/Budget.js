import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    limit: {
      type: Number,
      required: [true, "Budget limit is required"],
      min: [1, "Budget must be greater than 0"],
    },
    period: {
      type: String,
      enum: ["monthly", "weekly"],
      default: "monthly",
    },
    // Month start date - for tracking which month this budget belongs to
    month: {
      type: String, // format: "YYYY-MM"
      required: true,
    },
  },
  { timestamps: true }
);

// Ek user ek category ka ek hi budget per month rakh sakta hai
budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

const Budget = mongoose.model("Budget", budgetSchema);
export default Budget;