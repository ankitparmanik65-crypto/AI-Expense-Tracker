import express from "express";
import {
  createTaxInvestment,
  getTaxInvestments,
  getTaxSummary,
  updateTaxInvestment,
  deleteTaxInvestment,
} from "../controllers/taxController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").post(createTaxInvestment).get(getTaxInvestments);
router.get("/summary", getTaxSummary);
router.route("/:id").put(updateTaxInvestment).delete(deleteTaxInvestment);

export default router;