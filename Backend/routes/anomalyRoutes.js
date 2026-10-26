import express from "express";
import { getAnomalies } from "../controllers/anomalyController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getAnomalies);

export default router;