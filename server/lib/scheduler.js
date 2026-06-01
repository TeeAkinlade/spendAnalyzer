const cron = require("node-cron");

const { getRemindersAsync, markReminderSent } = require("./db");
const { sendReminderEmail } = require("./email");
const { buildReminderEmail } = require("./reminderEmailTemplate");

let started = false;

function parseIsoToDate(iso) {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? null : d;
}

async function tickOnce() {
	const reminders = await getRemindersAsync();
	const now = new Date();

	const emailConfigured =
		!!process.env.EMAIL_HOST &&
		!!process.env.EMAIL_PORT &&
		!!process.env.EMAIL_USER &&
		!!process.env.EMAIL_PASS;
	if (!emailConfigured) return;

	for (const r of reminders) {
		if (r.status === "sent") continue;
		const to = String(
			r.toEmail || process.env.REMINDER_TO_EMAIL || process.env.EMAIL_USER || "",
		)
			.trim()
			.toLowerCase();
		if (!to) continue;
		const dueAt = parseIsoToDate(r.scheduledAt);
		if (!dueAt) continue;

		if (dueAt.getTime() <= now.getTime()) {
			const { subject, text, html } = buildReminderEmail({
				title: r.title,
				message: r.message,
				scheduledAt: r.scheduledAt,
			});

			await sendReminderEmail({ to, subject, text, html });
			await markReminderSent(r.id);
		}
	}
}

async function startReminderScheduler() {
	if (started) return;
	started = true;

	// Runs frequently enough to handle one-time reminders without setTimeout limits.
	cron.schedule(
		"*/30 * * * * *",
		async () => {
			try {
				await tickOnce();
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("[scheduler] tick failed:", err?.message || err);
			}
		},
		{ timezone: process.env.TZ || "UTC" },
	);

	// Ensure we don't wait for the next cron tick after server restart.
	setTimeout(() => {
		tickOnce().catch((err) =>
			console.error(
				"[scheduler] startup tick failed:",
				err?.message || err,
			),
		);
	}, 1000);
}

module.exports = { startReminderScheduler };
