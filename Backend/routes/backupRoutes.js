import express from "express";
import {
  exportBackup,
  previewBackup,
  restoreBackup,
  getBackupHistory,
} from "../controllers/backupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/history", getBackupHistory); 
router.get("/", exportBackup);
router.post("/preview", previewBackup);
router.post("/restore", restoreBackup);


export default router;