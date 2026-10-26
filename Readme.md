# 💰 AI Expense Tracker

> A production-grade, AI-powered expense tracking application built with the MERN stack. Track expenses, manage budgets, plan finances, and get personalized AI-driven insights — all in one place.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![MERN](https://img.shields.io/badge/stack-MERN-61DAFB)
![AI](https://img.shields.io/badge/AI-Groq%20LLM-orange)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [AI Features](#-ai-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Screenshots](#-screenshots)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Key Technical Decisions](#-key-technical-decisions)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 🎯 Overview

**AI Expense Tracker** is a full-featured personal finance management application that combines traditional expense tracking with cutting-edge AI capabilities. Built on the MERN stack (MongoDB, Express, React, Node.js) with Groq LLM integration, it delivers a seamless, intelligent experience for managing personal finances.

### What Makes It Different

- **12 AI-powered features** including receipt OCR, voice input, chatbot, and financial planning
- **Hybrid AI architecture** — deterministic formula-based calculations + LLM text enhancement for 100% reliability
- **Multi-account support** with automatic balance updates
- **Production-grade** — retry logic, fallbacks, error handling, dark mode, mobile responsive
- **20+ features** across MVP, V2, and V3 tiers

---

## ✨ Key Features

### Core Features
- 🔐 **Authentication** — Secure JWT-based auth with password hashing (bcrypt)
- 💸 **Expense/Income Tracking** — Full CRUD with filters, search, tags, payment methods
- 📂 **Categories** — 12 predefined categories + AI auto-categorization
- 💳 **Multi-Account Support** — Bank, credit card, wallet, cash, investment accounts
- 📊 **Dashboard** — Summary cards, pie/bar charts, recent transactions
- 💰 **Budgets** — Category-wise monthly budgets with 80%/100% alerts
- 📈 **Reports** — Date range, multi-filter, category/account breakdown, CSV export
- 🎯 **Goals** — Savings goals with progress tracking and deadlines
- 💾 **Backup/Restore** — Full JSON export/import with merge & replace modes
- 🌙 **Dark Mode** — System-aware theme with manual toggle
- 📱 **Mobile Responsive** — Works on all screen sizes

### AI-Powered Features
1. **🤖 AI Auto-Categorization** — Description → category via Groq LLM
2. **💬 AI Chatbot** — Natural language queries with tool calling (Hinglish support)
3. **🧾 Receipt OCR** — Tesseract.js + Groq for structured extraction
4. **🎤 Voice Input** — Web Speech API + AI parsing
5. **📈 Expense Forecast** — 6-month prediction with trend analysis
6. **❤️ Financial Health Score** — 5-factor composite scoring (0-100)
7. **🚨 Anomaly Detection** — Z-score + IQR based unusual transaction detection
8. **🔄 Recurring Detection** — Auto-detect subscriptions and regular payments
9. **🧠 Advanced AI Coach** — Weekly personalized financial plans
10. **📊 Smart Insights** — AI-generated financial analysis
11. **🎯 Personalized Financial Planning** — Retirement, goals, emergency fund planning
12. **📋 Tax Workflows** — 80C/80D/NPS tracking with AI advisor

### Smart Alerts (Email)
- 📊 Budget alerts (80% and 100% thresholds)
- 📈 Weekly summary (every Sunday 9 AM)
- 🚨 Unusual transaction warnings

### Utility Features
- 🔍 Duplicate detection
- 📄 CSV export (transactions, reports)
- 🔒 Rate-limited AI with retry logic
- ⚡ AI health check on server startup

---

## 🤖 AI Features

### Hybrid AI Architecture

The application uses a **two-layer approach** for maximum reliability:

```
┌─────────────────────────────────────────┐
│  Layer 1: Deterministic Calculations    │
│  (Always works — no AI needed)          │
│  • Formula-based retirement corpus      │
│  • Statistical trend analysis           │
│  • Z-score anomaly detection            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 2: AI Enhancement (Optional)     │
│  (Warm, personalized text)              │
│  • Groq LLM for wording                 │
│  • Retry logic on failures              │
│  • Graceful fallback if unavailable     │
└─────────────────────────────────────────┘
```

**Key benefit:** Even if the AI fails, users always get accurate numbers and functional features.

### AI Model Configuration

Centralized in `backend/config/aiConfig.js`:

```js
export const AI_MODEL = "openai/gpt-oss-120b";
export const AI_MODELS = {
  small: "openai/gpt-oss-20b",
  large: "openai/gpt-oss-120b",
  chat: "openai/gpt-oss-120b",
};
```

### Retry Logic

All AI calls use `groqWithRetry` helper with:
- 3 retry attempts on JSON validation failures
- Exponential backoff (800ms, 1.6s, 3.2s)
- Automatic fallback to rule-based responses

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS v4** | Styling & dark mode |
| **React Router v6** | Routing |
| **Axios** | HTTP client |
| **Recharts** | Charts (pie, bar) |
| **Tesseract.js** | Client-side OCR |
| **Web Speech API** | Voice recognition |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM |
| **JWT** | Authentication |
| **bcryptjs** | Password hashing |
| **Nodemailer** | Email alerts |
| **node-cron** | Scheduled tasks |
| **Groq SDK** | AI/LLM integration |

### DevOps / Services
| Service | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud database |
| **Groq API** | LLM inference |
| **Gmail SMTP** | Email delivery |
| **GitHub** | Version control |
| **Vercel** | Frontend hosting *(planned)* |
| **Render** | Backend hosting *(planned)* |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT (React)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Pages: Dashboard, Accounts, Reports, Coach,       │  │
│  │         Planning, Tax, Chat, Budgets, Goals        │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Context: Auth, Theme                              │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           ↓ Axios (JWT)
┌──────────────────────────────────────────────────────────┐
│              SERVER (Node.js + Express)                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Routes → Controllers → Services                   │  │
│  │  • /api/auth      → authController                 │  │
│  │  • /api/transactions → transactionController       │  │
│  │  • /api/accounts  → accountController              │  │
│  │  • /api/ai        → aiController, chatController   │  │
│  │  • /api/coach     → coachController                │  │
│  │  • /api/planning  → planningController             │  │
│  │  • /api/tax       → taxController                  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Middleware: JWT auth, CORS, error handling        │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Utils: groqHelper, emailService, cronJobs         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
          ↓                    ↓                    ↓
   ┌────────────┐      ┌────────────┐      ┌────────────┐
   │  MongoDB   │      │  Groq LLM  │      │ Gmail SMTP │
   │   Atlas    │      │    API     │      │   Alerts   │
   └────────────┘      └────────────┘      └────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier works)
- Groq API key (free tier)
- Gmail account with App Password

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ankitparmanik65-crypto/ai-expense-tracker.git
   cd ai-expense-tracker
   ```

2. **Backend setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables** (see [Environment Variables](#-environment-variables))

5. **Run the backend**
   ```bash
   cd backend
   npm run dev
   ```
   Expected output:
   ```
   🚀 Server running on port 5000
   ✅ MongoDB Connected
   ✅ AI Available: Groq (openai/gpt-oss-120b) — 890ms
   ⏰ Cron jobs scheduled
   ```

6. **Run the frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173`

---

## 🔐 Environment Variables

Create `backend/.env` with:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-expense-tracker

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# AI (Groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx

# Email Alerts (Gmail App Password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

### Getting API Keys

**Groq API Key:**
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up / log in
3. Go to API Keys → Create New Key
4. Copy the key (starts with `gsk_`)

**Gmail App Password:**
1. Enable 2-Step Verification in [Google Account Security](https://myaccount.google.com/security)
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Create app password → copy 16-character code

**MongoDB Atlas:**
1. Free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Network Access → Allow `0.0.0.0/0`
4. Copy connection string

---

## 📡 API Documentation

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transactions` | Create transaction |
| GET | `/api/transactions` | Get all (with filters) |
| GET | `/api/transactions/:id` | Get one |
| PUT | `/api/transactions/:id` | Update |
| DELETE | `/api/transactions/:id` | Delete |
| GET | `/api/transactions/summary` | Total income/expense/balance |
| GET | `/api/transactions/category-summary` | Category-wise breakdown |
| GET | `/api/transactions/monthly-summary` | 6-month trend |
| POST | `/api/transactions/check-duplicate` | Check for duplicates |

### Accounts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts` | Create account |
| GET | `/api/accounts` | Get all with total balance |
| GET | `/api/accounts/:id/detail` | Account detail with stats |
| PUT | `/api/accounts/:id` | Update |
| DELETE | `/api/accounts/:id` | Delete (blocks if txns exist) |
| PATCH | `/api/accounts/:id/recalculate` | Recalculate balance |

### AI Features
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/categorize` | Auto-categorize description |
| POST | `/api/ai/chat` | Chatbot (tool calling) |
| POST | `/api/ai/receipt/parse` | Parse OCR text |
| POST | `/api/ai/voice/parse` | Parse voice input |
| GET | `/api/insights` | AI insights |
| GET | `/api/forecast` | Expense forecast |
| GET | `/api/health-score` | Financial health score |
| GET | `/api/anomalies` | Anomaly detection |
| GET | `/api/recurring` | Recurring payments |

### Coach & Planning
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/coach` | Current weekly plan |
| POST | `/api/coach/regenerate` | Regenerate plan |
| GET | `/api/coach/history` | Past plans |
| GET | `/api/planning/profile` | Financial profile |
| POST | `/api/planning/profile` | Save profile |
| POST | `/api/planning/plan/generate` | Generate plan |

### Tax
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tax` | Add investment |
| GET | `/api/tax` | Get FY investments |
| GET | `/api/tax/summary` | AI tax advisor |
| PUT | `/api/tax/:id` | Update |
| DELETE | `/api/tax/:id` | Delete |

### Reports & Backup
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports` | Filtered report |
| GET | `/api/reports/export` | Export report as CSV |
| GET | `/api/backup` | Export all data as JSON |
| POST | `/api/backup/preview` | Preview backup file |
| POST | `/api/backup/restore` | Restore backup |
| GET | `/api/backup/history` | Backup history |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts/settings` | Get alert settings |
| POST | `/api/alerts/test` | Send test email |
| PATCH | `/api/alerts/toggle` | Toggle alerts on/off |

---

## 📁 Project Structure

```
AI EXPENSE TRACKER/
├── backend/
│   ├── config/
│   │   ├── aiConfig.js          # Centralized AI model config
│   │   └── db.js                # MongoDB connection
│   ├── controllers/
│   │   ├── accountController.js
│   │   ├── aiController.js
│   │   ├── alertController.js
│   │   ├── anomalyController.js
│   │   ├── authController.js
│   │   ├── backupController.js
│   │   ├── budgetController.js
│   │   ├── chatController.js
│   │   ├── coachController.js
│   │   ├── exportController.js
│   │   ├── forecastController.js
│   │   ├── goalController.js
│   │   ├── healthScoreController.js
│   │   ├── insightController.js
│   │   ├── planningController.js
│   │   ├── receiptController.js
│   │   ├── recurringController.js
│   │   ├── reportController.js
│   │   ├── taxController.js
│   │   ├── transactionController.js
│   │   └── voiceController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Account.js
│   │   ├── BackupLog.js
│   │   ├── Budget.js
│   │   ├── CoachPlan.js
│   │   ├── FinancialPlan.js
│   │   ├── FinancialProfile.js
│   │   ├── Goal.js
│   │   ├── Insight.js
│   │   ├── TaxInvestment.js
│   │   ├── Transaction.js
│   │   └── User.js
│   ├── routes/
│   │   ├── accountRoutes.js
│   │   ├── aiRoutes.js
│   │   ├── alertRoutes.js
│   │   ├── anomalyRoutes.js
│   │   ├── authRoutes.js
│   │   ├── backupRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── coachRoutes.js
│   │   ├── exportRoutes.js
│   │   ├── forecastRoutes.js
│   │   ├── goalRoutes.js
│   │   ├── healthScoreRoutes.js
│   │   ├── insightRoutes.js
│   │   ├── planningRoutes.js
│   │   ├── recurringRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── taxRoutes.js
│   │   └── transactionRoutes.js
│   ├── utils/
│   │   ├── aiHealthCheck.js
│   │   ├── aiService.js
│   │   ├── analyticsService.js
│   │   ├── anomalyService.js
│   │   ├── balanceHelper.js
│   │   ├── budgetAlertHelper.js
│   │   ├── chatService.js
│   │   ├── coachService.js
│   │   ├── cronJobs.js
│   │   ├── emailService.js
│   │   ├── forecastService.js
│   │   ├── generateToken.js
│   │   ├── groqHelper.js        # Retry wrapper for Groq API
│   │   ├── healthScoreService.js
│   │   ├── insightService.js
│   │   ├── planningService.js
│   │   ├── receiptParser.js
│   │   ├── recurringService.js
│   │   └── voiceParser.js
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnomalyCard.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── CategoryPieChart.jsx
│   │   │   ├── ForecastCard.jsx
│   │   │   ├── HealthScoreCard.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── InsightsCard.jsx
│   │   │   ├── MonthlyBarChart.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ReceiptUpload.jsx
│   │   │   ├── RecurringCard.jsx
│   │   │   ├── SummaryCards.jsx
│   │   │   ├── TransactionForm.jsx
│   │   │   ├── TransactionItem.jsx
│   │   │   └── VoiceInput.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── pages/
│   │   │   ├── AccountDetail.jsx
│   │   │   ├── Accounts.jsx
│   │   │   ├── AddTransaction.jsx
│   │   │   ├── Budgets.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Coach.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── EditTransaction.jsx
│   │   │   ├── Goals.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Planning.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── Tax.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── format.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🎓 Key Technical Decisions

### 1. Hybrid AI Architecture
Rather than relying purely on LLM output, all financial calculations use **deterministic formulas**, with AI used only for **text enhancement**. This ensures:
- Numbers are always accurate (no hallucination)
- Features work even if AI is unavailable
- Cost-efficient (fewer AI calls)

### 2. Centralized AI Configuration
All AI model references are in `backend/config/aiConfig.js`. Changing the model in one place updates the entire app.

### 3. Retry Logic for AI
`groqHelper.js` wraps all AI calls with automatic retry on JSON validation failures — a known behavior with reasoning models like `gpt-oss-120b`.

### 4. Balance Consistency
Account balances are updated via **event-driven** hooks in the transaction controller (create/update/delete). A "recalculate" endpoint exists to reconstruct balance from transaction history.

### 5. Client-Side OCR
Receipt OCR runs in the browser via **Tesseract.js**, then sends only the extracted text to the backend for AI parsing. This reduces server load and API costs.

### 6. Timezone-Aware Date Handling
All date filters construct dates in **local timezone** (`new Date(y, m-1, d)`) rather than UTC (`new Date("YYYY-MM-DD")`) to avoid off-by-one-day issues for Indian users (UTC+5:30).

### 7. Duplicate Detection at Two Layers
Duplicate transactions are caught both:
- **Frontend** — user sees a modal with confirm option
- **Backend** — pre-save check prevents API-level duplicates

### 8. Email Cron Jobs
Weekly summaries are sent via `node-cron` at Sunday 9 AM IST. Budget alerts fire immediately on transaction creation.

---

## 🗺 Roadmap

### ✅ Completed (MVP + V2 + V3)
- [x] Authentication (JWT)
- [x] Transactions CRUD
- [x] Multi-account support
- [x] Dashboard with charts
- [x] Budgets with alerts
- [x] Reports (date range, multi-filter)
- [x] AI Chatbot
- [x] Receipt OCR
- [x] Voice input
- [x] AI Insights
- [x] Expense forecast
- [x] Financial health score
- [x] Anomaly detection
- [x] Recurring detection
- [x] Goals
- [x] Tax workflows (80C/80D)
- [x] AI Coach (weekly plan)
- [x] Personalized financial planning
- [x] Backup/Restore (JSON)
- [x] Smart email alerts
- [x] Dark mode
- [x] Mobile responsive

### 🚧 Planned
- [ ] Family sharing (multi-user)
- [ ] PDF monthly reports
- [ ] PWA (installable app)
- [ ] Bank/UPI integration (mock)

### 🎯 Future Scope
- [ ] Real bank API integration (Account Aggregator)
- [ ] Investment portfolio tracking
- [ ] Tax filing assistance
- [ ] Multi-currency support
- [ ] Offline-first PWA
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Ankit Parmanik**

- GitHub: https://github.com/ankitparmanik65-crypto
- LinkedIn: https://www.linkedin.com/in/ankit-parmanik-bb0579402/
- Email: ankitparmanik65@gmail.com

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) — Blazing fast LLM inference
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — Free cloud database
- [Vercel](https://vercel.com) & [Render](https://render.com) — Free hosting
- [Tesseract.js](https://tesseract.projectnaptha.com/) — Client-side OCR
- [Recharts](https://recharts.org/) — Beautiful React charts
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS

---

## ⭐ Show Your Support

If this project helped you, please give it a ⭐ on GitHub!

---

<div align="center">

**Built with ❤️ using MERN Stack + AI**

*Last updated: October 2026*

</div>