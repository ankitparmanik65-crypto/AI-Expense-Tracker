import { parseReceiptText } from "../utils/receiptParser.js";

// @desc    Parse receipt OCR text into structured data
// @route   POST /api/ai/receipt/parse
// @access  Private
export const parseReceipt = async (req, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || rawText.trim() === "") {
      return res.status(400).json({ message: "rawText is required" });
    }

    const result = await parseReceiptText(rawText);

    res.json(result);
  } catch (error) {
    console.error("Parse receipt error:", error);
    res.status(500).json({ message: "Failed to parse receipt" });
  }
};