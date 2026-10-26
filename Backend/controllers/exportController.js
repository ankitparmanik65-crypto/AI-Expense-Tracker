import Transaction from "../models/Transaction.js";

// @desc    Export transactions as CSV
// @route   GET /api/export/csv
// @access  Private
export const exportTransactionsCSV = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const filter = { user: req.user._id };
    if (type && type !== "all") filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    if (transactions.length === 0) {
      return res.status(404).json({ message: "No transactions to export" });
    }

    // CSV header
    const headers = [
      "Date",
      "Type",
      "Category",
      "Amount (INR)",
      "Description",
      "Payment Method",
      "Tags",
    ];

    // Escape karo CSV me comma/special chars ke liye
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Rows banao
    const rows = transactions.map((t) => {
      const date = new Date(t.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return [
        date,
        t.type,
        t.category,
        t.amount,
        t.description || "",
        t.paymentMethod || "",
        (t.tags || []).join("; "),
      ]
        .map(escapeCSV)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    // Filename generate karo
    const today = new Date().toISOString().slice(0, 10);
    const filename = `transactions-${type || "all"}-${today}.csv`;

    // Response headers
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    // BOM add karo (Excel me Hindi/special chars ke liye)
    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("Export CSV error:", error);
    res.status(500).json({ message: "Failed to export transactions" });
  }
};