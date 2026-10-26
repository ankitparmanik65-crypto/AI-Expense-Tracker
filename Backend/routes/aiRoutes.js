import express from "express";
import { categorize } from "../controllers/aiController.js";
import { chat } from "../controllers/chatController.js";
import { parseReceipt } from "../controllers/receiptController.js";
import { parseVoice } from "../controllers/voiceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/categorize", categorize);
router.post("/chat", chat);
router.post("/receipt/parse", parseReceipt);
router.post("/voice/parse", parseVoice);

export default router;