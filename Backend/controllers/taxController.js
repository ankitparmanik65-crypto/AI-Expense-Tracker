import TaxInvestment from "../models/TaxInvestment.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";
import Groq from "groq-sdk";
import { AI_MODEL } from "../config/aiConfig.js";
import { groqWithRetry } from "../utils/groqHelper.js";

// Section limits (FY 2025-26)
const SECTION_LIMITS = {
  "80C": 150000,
  "80D": 25000,
  "80CCD1B": 50000,
  "24b": 200000,
  "80E": null, // No limit
  "80G": null,
  "HRA": null,
  Other: null,
};

const SECTION_LABELS = {
  "80C": "PPF, ELSS, Life Insurance, EPF",
  "80D": "Health Insurance Premium",
  "80CCD1B": "NPS Additional",
  "24b": "Home Loan Interest",
  "80E": "Education Loan Interest",
  "80G": "Donations",
  HRA: "House Rent Allowance",
  Other: "Other Tax Savings",
};

// Helper: Financial year from date (India: Apr-Mar)
const getFinancialYear = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
};

// Helper: Current financial year
const getCurrentFY = () => getFinancialYear(new Date());

let groqClient = null;
const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set");
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

// @desc    Create tax investment
// @route   POST /api/tax
// @access  Private
export const createTaxInvestment = async (req, res) => {
  try {
    const { section, name, amount, date, provider, note } = req.body;

    if (!section || !name || !amount || !date) {
      return res
        .status(400)
        .json({ message: "Section, name, amount, and date are required" });
    }

    const financialYear = getFinancialYear(date);

    const investment = await TaxInvestment.create({
      user: req.user._id,
      section,
      name,
      amount: Number(amount),
      date,
      financialYear,
      provider: provider || "",
      note: note || "",
    });

    res.status(201).json(investment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get tax investments for FY
// @route   GET /api/tax
// @access  Private
export const getTaxInvestments = async (req, res) => {
  try {
    const financialYear = req.query.fy || getCurrentFY();

    const investments = await TaxInvestment.find({
      user: req.user._id,
      financialYear,
    }).sort({ date: -1 });

    // Group by section
    const bySection = {};
    investments.forEach((inv) => {
      if (!bySection[inv.section]) {
        bySection[inv.section] = {
          section: inv.section,
          label: SECTION_LABELS[inv.section] || inv.section,
          limit: SECTION_LIMITS[inv.section],
          total: 0,
          count: 0,
          investments: [],
        };
      }
      bySection[inv.section].total += inv.amount;
      bySection[inv.section].count++;
      bySection[inv.section].investments.push(inv);
    });

    // Calculate sections summary
    const sections = Object.values(bySection).map((s) => {
      const limit = s.limit;
      const used = s.total;
      const remaining = limit ? Math.max(limit - used, 0) : null;
      const percentage = limit ? Math.min(Math.round((used / limit) * 100), 100) : null;

      return {
        section: s.section,
        label: s.label,
        limit,
        used,
        remaining,
        percentage,
        count: s.count,
        investments: s.investments,
      };
    });

    // Total tax saved (approximate: 30% tax bracket)
    const total80C = sections.find((s) => s.section === "80C")?.used || 0;
    const total80D = sections.find((s) => s.section === "80D")?.used || 0;
    const total80CCD1B = sections.find((s) => s.section === "80CCD1B")?.used || 0;

    const totalDeductions = sections
      .filter((s) => s.limit !== null)
      .reduce((sum, s) => sum + Math.min(s.used, s.limit || 0), 0);

    // Approximate tax saving (30% slab + 4% cess)
    const estimatedTaxSaved = Math.round(totalDeductions * 0.312);

    res.json({
      financialYear,
      investments,
      sections,
      summary: {
        totalInvested: investments.reduce((sum, i) => sum + i.amount, 0),
        totalDeductions,
        estimatedTaxSaved,
        maxPossibleDeduction:
          (SECTION_LIMITS["80C"] || 0) +
          (SECTION_LIMITS["80D"] || 0) +
          (SECTION_LIMITS["80CCD1B"] || 0) +
          (SECTION_LIMITS["24b"] || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get tax summary + AI suggestions
// @route   GET /api/tax/summary
// @access  Private
export const getTaxSummary = async (req, res) => {
  try {
    const financialYear = req.query.fy || getCurrentFY();

    const investments = await TaxInvestment.find({
      user: req.user._id,
      financialYear,
    });

    // Group by section
    const totals = {};
    investments.forEach((inv) => {
      totals[inv.section] = (totals[inv.section] || 0) + inv.amount;
    });

    // Section-wise status
    const sectionsStatus = [];
    Object.keys(SECTION_LIMITS).forEach((section) => {
      if (section === "Other") return;
      const limit = SECTION_LIMITS[section];
      const used = totals[section] || 0;
      const remaining = limit ? Math.max(limit - used, 0) : 0;
      const percentage = limit ? Math.round((used / limit) * 100) : 0;

      // Include only if user has invested OR it's a common section
      if (used > 0 || ["80C", "80D"].includes(section)) {
        sectionsStatus.push({
          section,
          label: SECTION_LABELS[section],
          limit,
          used,
          remaining,
          percentage,
          maxed: limit ? used >= limit : false,
        });
      }
    });

    // AI suggestions
    let aiSuggestions = [];
    let aiSummary = "";

    const hasData = investments.length > 0;

    if (hasData || true) {
      try {
        const groq = getGroqClient();

        const prompt = `You are an Indian tax advisor. Analyze this user's tax-saving investments for FY ${financialYear} and give personalized suggestions.

Current investments by section:
${sectionsStatus
  .map(
    (s) =>
      `- ${s.section} (${s.label}): ₹${s.used} used of ₹${s.limit || "unlimited"} limit (${s.percentage}%${s.maxed ? " - MAXED" : ""})`
  )
  .join("\n")}

Return ONLY a JSON object:
{
  "summary": "2-3 sentence summary in Hinglish about the user's tax-saving status and how much more they can save",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]
}

Rules:
- Summary should mention specific amounts and remaining limits
- Suggestions should be specific Indian tax-saving options (PPF, ELSS, NPS, health insurance etc.)
- Focus on sections that are NOT maxed out
- Each suggestion max 15 words
- Reply ONLY with valid JSON`;

        const completion = await groqWithRetry(groq, {
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content: "You are an Indian tax advisor. Reply only with valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        aiSummary = parsed.summary || "";
        aiSuggestions = Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 4)
          : [];
      } catch (err) {
        console.error("Tax AI error:", err.message);
        aiSummary = `Aapne is FY me ₹${Object.values(totals).reduce(
          (a, b) => a + b,
          0
        )} tax-saving investments ki hain. 80C limit ₹1,50,000 hai — agar remaining hai to ELSS ya PPF me invest karo.`;
        aiSuggestions = [
          "80C limit ke andar ELSS mutual funds me invest karo",
          "Health insurance le kar 80D ka benefit lo (₹25,000)",
          "NPS me ₹50,000 extra invest karo (80CCD1B)",
          "Home loan hai to interest 24(b) me claim karo",
        ];
      }
    }

    res.json({
      financialYear,
      sectionsStatus,
      aiSummary,
      aiSuggestions,
    });
  } catch (error) {
    console.error("Tax summary error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update tax investment
// @route   PUT /api/tax/:id
// @access  Private
export const updateTaxInvestment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const investment = await TaxInvestment.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
    }

    const allowed = ["section", "name", "amount", "date", "provider", "note"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        investment[field] = req.body[field];
      }
    });

    if (req.body.date) {
      investment.financialYear = getFinancialYear(req.body.date);
    }

    const updated = await investment.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete tax investment
// @route   DELETE /api/tax/:id
// @access  Private
export const deleteTaxInvestment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const investment = await TaxInvestment.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.json({ message: "Deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};