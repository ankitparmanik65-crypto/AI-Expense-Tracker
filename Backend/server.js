import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import forecastRoutes from "./routes/forecastRoutes.js";
import healthScoreRoutes from "./routes/healthScoreRoutes.js";
import anomalyRoutes from "./routes/anomalyRoutes.js";
import recurringRoutes from "./routes/recurringRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import { startCronJobs } from "./utils/cronJobs.js";
import { checkAIAvailability } from "./utils/aiHealthCheck.js";
import accountRoutes from "./routes/accountRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import coachRoutes from "./routes/coachRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import planningRoutes from "./routes/planningRoutes.js";


dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "AI Expense Tracker API is running 🚀" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/health-score", healthScoreRoutes);
app.use("/api/anomalies", anomalyRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/planning", planningRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startCronJobs();
  await checkAIAvailability();
});