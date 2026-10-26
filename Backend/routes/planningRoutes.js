import express from "express";
import {
  getProfile,
  saveProfile,
  getPlan,
  generatePlan,
  getHistory,
} from "../controllers/planningController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/profile").get(getProfile).post(saveProfile);
router.get("/plan", getPlan);
router.post("/plan/generate", generatePlan);
router.get("/history", getHistory);

export default router;