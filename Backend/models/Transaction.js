import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "netbanking", "other"],
      default: "cash",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    tags: {
      type: [String],
      default: [],
    },
    receiptUrl: {
      type: String,
      default: "",
    },
    aiCategory: {
      type: String,
      default: "",
    },
    aiConfidence: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Fast queries ke liye compound index
transactionSchema.index({ user: 1, date: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
