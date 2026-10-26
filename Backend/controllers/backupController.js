import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import TaxInvestment from "../models/TaxInvestment.js";
import BackupLog from "../models/BackupLog.js";

// @desc    Export all user data as JSON
// @route   GET /api/backup
// @access  Private
export const exportBackup = async (req, res) => {
  try {
    const userId = req.user._id;

    const [transactions, accounts, budgets, goals, taxInvestments] =
      await Promise.all([
        Transaction.find({ user: userId }).lean(),
        Account.find({ user: userId }).lean(),
        Budget.find({ user: userId }).lean(),
        Goal.find({ user: userId }).lean(),
        TaxInvestment.find({ user: userId }).lean(),
      ]);

    const counts = {
      transactions: transactions.length,
      accounts: accounts.length,
      budgets: budgets.length,
      goals: goals.length,
      taxInvestments: taxInvestments.length,
    };

    const exportTime = new Date();

    const backup = {
      version: "1.0",
      exportedAt: exportTime.toISOString(),
      summary: `AI Expense Tracker Backup — ${req.user.name} — ${exportTime.toLocaleString("en-IN")} — ${counts.transactions} transactions, ${counts.accounts} accounts, ${counts.budgets} budgets, ${counts.goals} goals, ${counts.taxInvestments} tax investments`,
      user: {
        name: req.user.name,
        email: req.user.email,
      },
      data: {
        transactions,
        accounts,
        budgets,
        goals,
        taxInvestments,
      },
      counts,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const fileSize = Buffer.byteLength(jsonString, "utf8");

    try {
      await BackupLog.create({
        user: userId,
        counts,
        fileSize,
      });
    } catch (logErr) {
      console.error("Backup log error:", logErr.message);
    }

    const filename = `ai-expense-tracker-backup-${exportTime
      .toISOString()
      .slice(0, 10)}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    res.send(jsonString);
  } catch (error) {
    console.error("Backup export error:", error);
    res.status(500).json({ message: "Failed to export backup" });
  }
};

// @desc    Get backup history (last 10)
// @route   GET /api/backup/history
// @access  Private
export const getBackupHistory = async (req, res) => {
  try {
    const logs = await BackupLog.find({ user: req.user._id })
      .sort({ exportedAt: -1 })
      .limit(10)
      .lean();

    res.json(logs);
  } catch (error) {
    console.error("Backup history error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Preview backup file before restore
// @route   POST /api/backup/preview
// @access  Private
export const previewBackup = async (req, res) => {
  try {
    const { backup } = req.body;

    if (!backup || typeof backup !== "object") {
      return res.status(400).json({ message: "Invalid backup file" });
    }

    if (!backup.version || !backup.data) {
      return res.status(400).json({ message: "Invalid backup format" });
    }

    const { data, counts, exportedAt, version } = backup;

    res.json({
      valid: true,
      version,
      exportedAt,
      counts: counts || {
        transactions: data.transactions?.length || 0,
        accounts: data.accounts?.length || 0,
        budgets: data.budgets?.length || 0,
        goals: data.goals?.length || 0,
        taxInvestments: data.taxInvestments?.length || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Restore user data from backup
// @route   POST /api/backup/restore
// @access  Private
export const restoreBackup = async (req, res) => {
  try {
    const { backup, mode = "merge" } = req.body;
    const userId = req.user._id;

    if (!backup || !backup.data || !backup.version) {
      return res.status(400).json({ message: "Invalid backup file" });
    }

    const { transactions, accounts, budgets, goals, taxInvestments } =
      backup.data;

    const stats = {
      transactions: 0,
      transactionsSkipped: 0,
      accounts: 0,
      accountsSkipped: 0,
      budgets: 0,
      budgetsSkipped: 0,
      goals: 0,
      goalsSkipped: 0,
      taxInvestments: 0,
      taxInvestmentsSkipped: 0,
    };

    // MODE: "replace" = purana delete karke naya import
    // MODE: "merge" = dono rakh (default)
    if (mode === "replace") {
      await Promise.all([
        Transaction.deleteMany({ user: userId }),
        Account.deleteMany({ user: userId }),
        Budget.deleteMany({ user: userId }),
        Goal.deleteMany({ user: userId }),
        TaxInvestment.deleteMany({ user: userId }),
      ]);
    }

    // ACCOUNTS PEHLE (transactions unse link hote hain)
    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        try {
          const exists = await Account.findOne({
            user: userId,
            name: acc.name,
          });

          if (!exists) {
            await Account.create({
              user: userId,
              name: acc.name,
              type: acc.type || "bank",
              balance: acc.balance || 0,
              initialBalance: acc.initialBalance || 0,
              icon: acc.icon || "🏦",
              color: acc.color || "#3b82f6",
              note: acc.note || "",
            });
            stats.accounts++;
          } else {
            stats.accountsSkipped++;
          }
        } catch (err) {
          console.error(`Account restore error for ${acc.name}:`, err.message);
        }
      }
    }

    // TRANSACTIONS — with duplicate check
    if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        try {
          // Duplicate check — same user, type, amount, category, description, same day
          const txDate = new Date(tx.date);
          const start = new Date(txDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(txDate);
          end.setHours(23, 59, 59, 999);

          const exists = await Transaction.findOne({
            user: userId,
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            description: (tx.description || "").trim(),
            date: { $gte: start, $lte: end },
          });

          if (!exists) {
            await Transaction.create({
              user: userId,
              type: tx.type,
              amount: tx.amount,
              category: tx.category,
              description: tx.description || "",
              paymentMethod: tx.paymentMethod || "other",
              date: tx.date,
              tags: tx.tags || [],
            });
            stats.transactions++;
          } else {
            stats.transactionsSkipped++;
          }
        } catch (err) {
          console.error(`Transaction restore error:`, err.message);
        }
      }
    }

    // BUDGETS
    if (budgets && budgets.length > 0) {
      for (const b of budgets) {
        try {
          const exists = await Budget.findOne({
            user: userId,
            category: b.category,
            month: b.month,
          });

          if (!exists) {
            await Budget.create({
              user: userId,
              category: b.category,
              limit: b.limit,
              period: b.period || "monthly",
              month: b.month,
            });
            stats.budgets++;
          } else {
            stats.budgetsSkipped++;
          }
        } catch (err) {
          console.error(`Budget restore error:`, err.message);
        }
      }
    }

    // GOALS
    if (goals && goals.length > 0) {
      for (const g of goals) {
        try {
          const exists = await Goal.findOne({
            user: userId,
            name: g.name,
          });

          if (!exists) {
            await Goal.create({
              user: userId,
              name: g.name,
              targetAmount: g.targetAmount,
              savedAmount: g.savedAmount || 0,
              deadline: g.deadline || null,
              icon: g.icon || "🎯",
              note: g.note || "",
              completed: g.completed || false,
            });
            stats.goals++;
          } else {
            stats.goalsSkipped++;
          }
        } catch (err) {
          console.error(`Goal restore error:`, err.message);
        }
      }
    }

    // TAX INVESTMENTS — with duplicate check
    if (taxInvestments && taxInvestments.length > 0) {
      for (const t of taxInvestments) {
        try {
          const tDate = new Date(t.date);
          const start = new Date(tDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(tDate);
          end.setHours(23, 59, 59, 999);

          const exists = await TaxInvestment.findOne({
            user: userId,
            section: t.section,
            name: (t.name || "").trim(),
            amount: t.amount,
            date: { $gte: start, $lte: end },
          });

          if (!exists) {
            await TaxInvestment.create({
              user: userId,
              section: t.section,
              name: t.name,
              amount: t.amount,
              date: t.date,
              financialYear: t.financialYear,
              provider: t.provider || "",
              note: t.note || "",
            });
            stats.taxInvestments++;
          } else {
            stats.taxInvestmentsSkipped++;
          }
        } catch (err) {
          console.error(`Tax restore error:`, err.message);
        }
      }
    }

    res.json({
      message: "Backup restored successfully",
      mode,
      stats,
    });
  } catch (error) {
    console.error("Restore error:", error);
    res.status(500).json({ message: "Failed to restore backup" });
  }
};