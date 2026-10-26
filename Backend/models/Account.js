import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: [50, "Name too long"],
    },
    type: {
      type: String,
      enum: ["bank", "credit_card", "wallet", "cash", "investment"],
      default: "bank",
    },
    balance: {
      type: Number,
      default: 0,
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    icon: {
      type: String,
      default: "🏦",
    },
    color: {
      type: String,
      default: "#3b82f6",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      default: "",
      maxlength: [200, "Note too long"],
    },
  },
  { timestamps: true }
);

// Ek user ke ek naam ke 2 accounts nahi ho sakte
accountSchema.index({ user: 1, name: 1 }, { unique: true });

const Account = mongoose.model("Account", accountSchema);
export default Account;