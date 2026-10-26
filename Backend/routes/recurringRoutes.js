import express from "express";
import { getRecurring } from "../controllers/recurringController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getRecurring);

export default router;