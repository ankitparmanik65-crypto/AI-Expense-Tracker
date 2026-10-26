import express from "express";
import { getHealthScore } from "../controllers/healthScoreController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getHealthScore);

export default router;