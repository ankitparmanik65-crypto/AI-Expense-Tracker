import mongoose from "mongoose";

const taxInvestmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    section: {
      type: String,
      enum: ["80C", "80D", "80CCD1B", "24b", "80E", "80G", "HRA", "Other"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Name too long"],
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be greater than 0"],
    },
    date: {
      type: Date,
      required: true,
    },
    financialYear: {
      type: String, // "2025-26"
      required: true,
    },
    provider: {
      type: String,
      default: "",
      trim: true,
    },
    proofUrl: {
      type: String,
      default: "",
    },
    note: {
      type: String,
      default: "",
      maxlength: [300, "Note too long"],
    },
  },
  { timestamps: true }
);

taxInvestmentSchema.index({ user: 1, financialYear: 1 });

const TaxInvestment = mongoose.model("TaxInvestment", taxInvestmentSchema);
export default TaxInvestment;