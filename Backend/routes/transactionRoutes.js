import express from "express";
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getCategorySummary,
  getMonthlySummary,
  checkDuplicate,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Sab routes protected hain
router.use(protect);

router.route("/").post(createTransaction).get(getTransactions);

router.get("/summary", getSummary);
router.get("/category-summary", getCategorySummary);
router.get("/monthly-summary", getMonthlySummary);
router.post("/check-duplicate", checkDuplicate); 


router
  .route("/:id")
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;