import Groq from "groq-sdk";
import { AI_MODEL } from "../config/aiConfig.js";
import { groqWithRetry } from "./groqHelper.js";
import Transaction from "../models/Transaction.js";

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in .env");
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

// ---------- TOOLS ----------

const getSummary = async (userId) => {
  const data = await Transaction.aggregate([
    { $match: { user: userId } },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);

  let income = 0;
  let expense = 0;
  data.forEach((item) => {
    if (item._id === "income") income = item.total;
    if (item._id === "expense") expense = item.total;
  });

  return { totalIncome: income, totalExpense: expense, balance: income - expense };
};

const getCategoryBreakdown = async (userId, type = "expense") => {
  const data = await Transaction.aggregate([
    { $match: { user: userId, type } },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  return data.map((d) => ({
    category: d._id,
    total: d.total,
    count: d.count,
  }));
};

const getTransactionsByPeriod = async (userId, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const transactions = await Transaction.find({
    user: userId,
    date: { $gte: since },
  })
    .sort({ date: -1 })
    .limit(50)
    .select("type amount category description date");

  return transactions;
};

const getMonthlyComparison = async (userId) => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonth = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: thisMonthStart },
        type: "expense",
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const lastMonth = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        type: "expense",
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return {
    thisMonthExpense: thisMonth[0]?.total || 0,
    lastMonthExpense: lastMonth[0]?.total || 0,
  };
};

// ---------- TOOLS DEFINITION ----------

const tools = [
  {
    type: "function",
    function: {
      name: "getSummary",
      description:
        "Get the user's overall financial summary — total income, total expense, and current balance. Use this when user asks about balance, total spending, total income, or overall financial status.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategoryBreakdown",
      description:
        "Get category-wise breakdown of spending or income. Use this when user asks 'where did my money go', 'which category has highest spending', or category-specific questions.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["expense", "income"],
            description:
              "Whether to get expense breakdown or income breakdown. Default expense.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTransactionsByPeriod",
      description:
        "Get list of transactions within a time period. Use when user asks about recent transactions, last week's spending, today's transactions, etc.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description:
              "Number of days to look back. For 'today' use 1, for 'this week' use 7, for 'this month' use 30, for 'last 3 months' use 90.",
          },
        },
        required: ["days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMonthlyComparison",
      description:
        "Compare this month's expense with last month's expense. Use when user asks 'am I spending more than last month' or 'compare this month with last month'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ---------- TOOL EXECUTOR ----------

const executeTool = async (toolName, args, userId) => {
  switch (toolName) {
    case "getSummary":
      return await getSummary(userId);
    case "getCategoryBreakdown":
      return await getCategoryBreakdown(userId, args.type || "expense");
    case "getTransactionsByPeriod":
      return await getTransactionsByPeriod(userId, args.days || 30);
    case "getMonthlyComparison":
      return await getMonthlyComparison(userId);
    default:
      return { error: "Unknown tool" };
  }
};

// ---------- MAIN CHAT FUNCTION ----------

export const chatWithAI = async (userMessage, userId) => {
  const groq = getGroqClient();

  const systemPrompt = `You are a helpful financial assistant for an expense tracker app called "AI Expense Tracker".

Your job: Answer user's questions about their finances using the available tools.

Rules:
- Always use tools to get real data. Never make up numbers.
- If user asks in Hindi, reply in Hindi. If English, reply in English. Mix karna ho to Hinglish theek hai.
- Keep replies short, friendly, and clear. Use ₹ symbol for amounts.
- If user asks something outside finance, politely say you can only help with finance.
- Format numbers in Indian style (e.g., ₹15,000 not ₹15000).
- Today's date is ${new Date().toLocaleDateString("en-IN")}.

Examples:
- User: "Is month kitna kharch hua?" → Call getSummary or getTransactionsByPeriod
- User: "Food pe kitna gaya?" → Call getCategoryBreakdown
- User: "Am I spending more than last month?" → Call getMonthlyComparison
- User: "Recent transactions dikhao" → Call getTransactionsByPeriod`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  let response = await groqWithRetry(groq, {
    model: AI_MODEL,
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.3,
    max_tokens: 1000,
  });

  let assistantMessage = response.choices[0].message;

  while (
    assistantMessage.tool_calls &&
    Array.isArray(assistantMessage.tool_calls) &&
    assistantMessage.tool_calls.length > 0
  ) {
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      console.log(`🔧 Calling tool: ${toolName}`, args);

      const result = await executeTool(toolName, args, userId);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    response = await groqWithRetry(groq, {
      model: AI_MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 1000,
    });

    assistantMessage = response.choices[0].message;
  }

  return {
    reply: assistantMessage.content,
  };
};