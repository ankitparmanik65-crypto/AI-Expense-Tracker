import express from "express";
import { getForecast } from "../controllers/forecastController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getForecast);

export default router;