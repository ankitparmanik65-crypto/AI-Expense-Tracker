import express from "express";

import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  recalculateBalance,
  getAccountDetail,
} from "../controllers/accountController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(createAccount).get(getAccounts);
router.patch("/:id/recalculate", recalculateBalance);
router
  .route("/:id")
  .get(getAccountById)
  .put(updateAccount)
  .delete(deleteAccount);
router.get("/:id/detail", getAccountDetail);

export default router;