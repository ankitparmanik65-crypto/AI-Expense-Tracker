import express from "express";
import {
  getReport,
  exportReportCSV,
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getReport);
router.get("/export", exportReportCSV);

export default router;