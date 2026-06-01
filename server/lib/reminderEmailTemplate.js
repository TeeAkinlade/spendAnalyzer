function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatScheduledAt(iso) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString(undefined, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function buildReminderEmail({ title, message, scheduledAt }) {
	const safeTitle = escapeHtml(title || "Reminder");
	const safeMessage = escapeHtml(
		message?.trim() ||
			"Review your budget plan and complete your planned actions.",
	);
	const when = formatScheduledAt(scheduledAt);
	const subject = title
		? `Spend Analyzer Reminder: ${title}`
		: "Spend Analyzer Reminder";

	const text = [
		"Spend Analyzer",
		"────────────────────────",
		"",
		title || "Reminder",
		"",
		message?.trim() ||
			"Review your budget plan and complete your planned actions.",
		"",
		`Scheduled for: ${when}`,
		"",
		"— Sent by Spend Analyzer",
	].join("\n");

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#818cf8 100%);padding:28px 32px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Spend Analyzer</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;line-height:1.3;color:#ffffff;">${safeTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your reminder</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#111827;white-space:pre-wrap;">${safeMessage}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;">Scheduled for</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${escapeHtml(when)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#6b7280;">
                Open Spend Analyzer to review your budget and mark planned items as done.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
                This is an automated reminder from Spend Analyzer.<br />
                You received this email because a reminder was set for your address.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	return { subject, text, html };
}

module.exports = { buildReminderEmail };
