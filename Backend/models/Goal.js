import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Goal name is required"],
      trim: true,
      maxlength: [100, "Name too long"],
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [1, "Target amount must be greater than 0"],
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: [0, "Saved amount cannot be negative"],
    },
    deadline: {
      type: Date,
      default: null,
    },
    icon: {
      type: String,
      default: "🎯",
    },
    note: {
      type: String,
      default: "",
      maxlength: [300, "Note too long"],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Virtual: progress percentage
goalSchema.virtual("progress").get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(Math.round((this.savedAmount / this.targetAmount) * 100), 100);
});

goalSchema.set("toJSON", { virtuals: true });
goalSchema.set("toObject", { virtuals: true });

const Goal = mongoose.model("Goal", goalSchema);
export default Goal;