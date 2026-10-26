import express from "express";
import {
  getPlan,
  regeneratePlan,
  getHistory,
} from "../controllers/coachController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getPlan);
router.post("/regenerate", regeneratePlan);
router.get("/history", getHistory);

export default router;