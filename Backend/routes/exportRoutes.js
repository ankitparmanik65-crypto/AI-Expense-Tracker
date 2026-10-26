import express from "express";
import { exportTransactionsCSV } from "../controllers/exportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/csv", exportTransactionsCSV);

export default router;