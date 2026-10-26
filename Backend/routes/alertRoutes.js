import express from "express";
import {
  sendTest,
  toggleAlerts,
  getSettings,
} from "../controllers/alertController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/settings", getSettings);
router.post("/test", sendTest);
router.patch("/toggle", toggleAlerts);

export default router;