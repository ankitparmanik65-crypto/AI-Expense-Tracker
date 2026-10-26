import express from "express";
import {
  createOrUpdateBudget,
  getBudgets,
  deleteBudget,
} from "../controllers/budgetController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(createOrUpdateBudget).get(getBudgets);
router.delete("/:id", deleteBudget);

export default router;