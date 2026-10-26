import mongoose from "mongoose";

const insightSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    insights: [
      {
        type: { type: String }, // "warning" | "tip" | "info"
        title: String,
        message: String,
        icon: String,
      },
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Insight = mongoose.model("Insight", insightSchema);
export default Insight;