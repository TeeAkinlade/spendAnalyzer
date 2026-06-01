const express = require("express");
const { z } = require("zod");
const { nanoid } = require("nanoid");

const {
	getRemindersAsync,
	addReminder,
	updateReminder,
	deleteReminder,
} = require("../lib/db");

function getClientId(req) {
	return req.get("X-Client-Id") || req.headers["x-client-id"] || null;
}

const reminderSchema = z.object({
	title: z.string().min(1).max(80).optional().default("Reminder"),
	message: z.string().max(1000).optional(),
	toEmail: z.string().email(),
	scheduledAt: z.string().min(1),
});

function parseScheduledAt(isoLike) {
	const d = new Date(isoLike);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
}

const router = express.Router();

router.get("/", async (req, res) => {
	const clientId = getClientId(req);
	try {
		const reminders = await getRemindersAsync(clientId);
		const sorted = reminders
			.slice()
			.sort((a, b) =>
				String(a.scheduledAt).localeCompare(String(b.scheduledAt)),
			);
		res.json(sorted);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[reminders] GET failed:", err?.message);
		res.status(500).json({ error: "Failed to fetch reminders" });
	}
});

router.post("/", async (req, res) => {
	const raw = req.body || {};
	const parsed = reminderSchema.safeParse(raw);
	if (!parsed.success) {
		return res
			.status(400)
			.json({
				error: "Invalid reminder payload",
				details: parsed.error.flatten(),
			});
	}

	const iso = parseScheduledAt(parsed.data.scheduledAt);
	if (!iso)
		return res
			.status(400)
			.json({ error: "scheduledAt must be a valid date/time" });

	try {
		const clientId = getClientId(req);
		const reminder = {
			id: nanoid(),
			title: parsed.data.title,
			message: parsed.data.message,
			toEmail: parsed.data.toEmail.toLowerCase().trim(),
			scheduledAt: iso,
			status: "pending",
			sentAt: null,
		};

		const created = await addReminder(reminder, clientId);
		res.json(created);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[reminders] POST failed:", err?.message);
		res.status(500).json({ error: "Failed to create reminder" });
	}
});

router.put("/:id", async (req, res) => {
	const { id } = req.params;
	const raw = req.body || {};
	const parsed = reminderSchema.partial().safeParse(raw);
	if (!parsed.success) {
		return res
			.status(400)
			.json({
				error: "Invalid reminder payload",
				details: parsed.error.flatten(),
			});
	}

	try {
		const clientId = getClientId(req);
		const reminders = await getRemindersAsync(clientId);
		const existing = reminders.find((r) => r.id === id);
		if (!existing)
			return res.status(404).json({ error: "Reminder not found" });
		if (existing.status === "sent") {
			return res
				.status(400)
				.json({
					error: "Cannot edit a sent reminder. Create a new one instead.",
				});
		}

		const patch = {};
		if (parsed.data.title !== undefined) patch.title = parsed.data.title;
		if (parsed.data.message !== undefined)
			patch.message = parsed.data.message;
		if (parsed.data.toEmail !== undefined)
			patch.toEmail = parsed.data.toEmail.toLowerCase().trim();
		if (parsed.data.scheduledAt !== undefined) {
			const iso = parseScheduledAt(parsed.data.scheduledAt);
			if (!iso)
				return res
					.status(400)
					.json({ error: "scheduledAt must be a valid date/time" });
			patch.scheduledAt = iso;
		}

		const updated = await updateReminder(id, patch, clientId);
		if (!updated)
			return res.status(404).json({ error: "Reminder not found" });
		res.json(updated);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[reminders] PUT failed:", err?.message);
		res.status(500).json({ error: "Failed to update reminder" });
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const clientId = getClientId(req);
		const ok = await deleteReminder(req.params.id, clientId);
		if (!ok) return res.status(404).json({ error: "Reminder not found" });
		res.json({ ok: true });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[reminders] DELETE failed:", err?.message);
		res.status(500).json({ error: "Failed to delete reminder" });
	}
});

module.exports = router;
