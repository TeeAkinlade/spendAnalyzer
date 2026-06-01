const nodemailer = require("nodemailer");

function envBoolean(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(normalized);
}

function getTransport() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 0);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const rejectUnauthorized = envBoolean("SMTP_TLS_REJECT_UNAUTHORIZED", true);

  if (!host || !port || !user || !pass) {
    throw new Error(
      "Missing email config. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized },
  });
}

async function sendReminderEmail({ to, subject, text, html }) {
  const transport = getTransport();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendReminderEmail };

