import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("EMAIL_USER or EMAIL_PASS not set in .env");
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const formatINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num || 0);

/**
 * Base email wrapper — consistent design
 */
const wrapEmail = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;">💰 AI Expense Tracker</h1>
    </div>
    <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 16px 16px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">${title}</h2>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
        Ye email AI Expense Tracker se automatically bheja gaya hai.
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Budget alert email — 80% ya 100% cross hone pe
 */
export const sendBudgetAlert = async (user, budgetData) => {
  const { category, spent, limit, percentage } = budgetData;
  const isExceeded = percentage >= 100;

  const title = isExceeded
    ? `⚠️ Budget Exceeded: ${category}`
    : `📊 Budget Alert: ${category} at ${percentage}%`;

  const accentColor = isExceeded ? "#ef4444" : "#f59e0b";
  const icon = isExceeded ? "🚨" : "⚠️";

  const body = `
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi ${user.name?.split(" ")[0] || "there"},
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      ${
        isExceeded
          ? `Aapka <strong>${category}</strong> budget exceed ho gaya hai.`
          : `Aapka <strong>${category}</strong> budget 80% se zyada use ho gaya hai.`
      }
    </p>
    <div style="background:#f9fafb;border-left:4px solid ${accentColor};border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;font-size:14px;color:#374151;">
        <tr>
          <td style="padding:4px 0;">Category:</td>
          <td style="text-align:right;font-weight:600;">${category}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Spent:</td>
          <td style="text-align:right;font-weight:600;color:${accentColor};">${formatINR(spent)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Budget:</td>
          <td style="text-align:right;font-weight:600;">${formatINR(limit)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Used:</td>
          <td style="text-align:right;font-weight:600;color:${accentColor};">${percentage}%</td>
        </tr>
      </table>
    </div>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">
      ${icon} ${
        isExceeded
          ? "Ab aage kharch karne se pehle sochein — ye category over budget hai."
          : "Thoda dhyan rakhein taaki month end tak budget ke andar rahein."
      }
    </p>
  `;

  const mailOptions = {
    from: `"AI Expense Tracker" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: isExceeded
      ? `⚠️ ${category} budget exceeded`
      : `📊 ${category} budget at ${percentage}%`,
    html: wrapEmail(title, body),
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`📧 Budget alert sent to ${user.email}:`, info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Weekly summary email
 */
export const sendWeeklySummary = async (user, summaryData) => {
  const {
    weekStart,
    weekEnd,
    income,
    expense,
    topCategory,
    transactionCount,
  } = summaryData;

  const title = `📈 Aapka Weekly Summary`;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

  const body = `
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi ${user.name?.split(" ")[0] || "there"}, yahan aapka weekly recap hai.
    </p>
    <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">
      ${formatDate(weekStart)} — ${formatDate(weekEnd)}
    </p>

    <div style="display:block;background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:12px;">
      <p style="margin:0;color:#166534;font-size:13px;">💰 Income</p>
      <p style="margin:4px 0 0;color:#16a34a;font-size:22px;font-weight:700;">${formatINR(income)}</p>
    </div>

    <div style="display:block;background:#fef2f2;border-radius:12px;padding:16px;margin-bottom:12px;">
      <p style="margin:0;color:#991b1b;font-size:13px;">💸 Expense</p>
      <p style="margin:4px 0 0;color:#dc2626;font-size:22px;font-weight:700;">${formatINR(expense)}</p>
    </div>

    <div style="display:block;background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#1e40af;font-size:13px;">💵 Net Savings</p>
      <p style="margin:4px 0 0;color:#2563eb;font-size:22px;font-weight:700;">${formatINR(income - expense)}</p>
    </div>

    <table style="width:100%;font-size:14px;color:#374151;margin-bottom:20px;">
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Total Transactions:</td>
        <td style="text-align:right;font-weight:600;">${transactionCount}</td>
      </tr>
      ${
        topCategory
          ? `
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Top Category:</td>
        <td style="text-align:right;font-weight:600;">${topCategory.category} (${formatINR(topCategory.total)})</td>
      </tr>`
          : ""
      }
    </table>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">
      Keep tracking! Apne dashboard pe detailed insights dekh sakte ho.
    </p>
  `;

  const mailOptions = {
    from: `"AI Expense Tracker" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `📈 Weekly Summary: ${formatINR(expense)} spent this week`,
    html: wrapEmail(title, body),
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`📧 Weekly summary sent to ${user.email}:`, info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Unusual spending alert
 */
export const sendAnomalyAlert = async (user, anomaly) => {
  const { amount, category, description, multiplier, categoryAvg } = anomaly;

  const title = `🚨 Unusual Transaction Detected`;

  const body = `
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi ${user.name?.split(" ")[0] || "there"},
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Aapke account me ek <strong>unusual transaction</strong> detect hua hai. Please verify karo.
    </p>

    <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;color:#991b1b;font-size:13px;font-weight:600;">TRANSACTION DETAILS</p>
      <table style="width:100%;font-size:14px;color:#374151;">
        <tr>
          <td style="padding:4px 0;">Amount:</td>
          <td style="text-align:right;font-weight:700;color:#dc2626;font-size:18px;">${formatINR(amount)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Category:</td>
          <td style="text-align:right;font-weight:600;">${category}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Description:</td>
          <td style="text-align:right;">${description || "(none)"}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Usual Average:</td>
          <td style="text-align:right;">${formatINR(categoryAvg)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;">Multiplier:</td>
          <td style="text-align:right;font-weight:600;color:#dc2626;">${multiplier}x higher</td>
        </tr>
      </table>
    </div>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">
      Agar ye aapki transaction nahi thi, to turant bank se contact karo. Warna isko ignore kar sakte ho.
    </p>
  `;

  const mailOptions = {
    from: `"AI Expense Tracker" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🚨 Unusual transaction: ${formatINR(amount)} in ${category}`,
    html: wrapEmail(title, body),
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`📧 Anomaly alert sent to ${user.email}:`, info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Test email — user can verify settings
 */
export const sendTestEmail = async (user) => {
  const title = "✅ Email Alerts Enabled";

  const body = `
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hi ${user.name?.split(" ")[0] || "there"},
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Great! Ab aapko smart alerts milenge:
    </p>
    <ul style="color:#4b5563;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px;">
      <li>📊 Budget alerts (80% aur 100% cross hone pe)</li>
      <li>📈 Weekly summary (har Sunday)</li>
      <li>🚨 Unusual transaction alerts</li>
    </ul>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">
      Aap kabhi bhi settings me jaake alerts off kar sakte ho.
    </p>
  `;

  const mailOptions = {
    from: `"AI Expense Tracker" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "✅ Email alerts enabled",
    html: wrapEmail(title, body),
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Test email error:", error.message);
    return { success: false, error: error.message };
  }
};