import mongoose from "mongoose";

const backupLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    exportedAt: {
      type: Date,
      default: Date.now,
    },
    counts: {
      transactions: Number,
      accounts: Number,
      budgets: Number,
      goals: Number,
      taxInvestments: Number,
    },
    fileSize: {
      type: Number, // in bytes
    },
  },
  { timestamps: true }
);

const BackupLog = mongoose.model("BackupLog", backupLogSchema);
export default BackupLog;