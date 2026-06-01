const express = require("express");
const { z } = require("zod");

const {
	getBudget,
	createBudget,
	getBudgetHistory,
	getBudgetById,
	updateBudgetById,
} = require("../lib/db");

function getClientId(req) {
	return req.get("X-Client-Id") || req.headers["x-client-id"] || null;
}

function isSaveName(name) {
	return /save/i.test(name) || /savings?/i.test(name);
}

function toNumberOrNull(v) {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function toNumberOrUndefined(v) {
	const n = toNumberOrNull(v);
	return n === null ? undefined : n;
}

function computeSummary(budget) {
	const income = Number(budget?.income || 0);
	const items = Array.isArray(budget?.items) ? budget.items : [];

	let savingsTotal = 0;
	let expensesTotal = 0;

	for (const item of items) {
		const name = String(item.name || "");
		const amount =
			item.type === "percent"
				? (income * Number(item.percent || 0)) / 100
				: Number(item.amount || 0);

		if (isSaveName(name)) savingsTotal += amount;
		else expensesTotal += amount;
	}

	const totalPlanned = savingsTotal + expensesTotal;
	const remainingIncome = income - totalPlanned;

	return {
		income,
		savingsTotal,
		expensesTotal,
		totalPlanned,
		remainingIncome,
	};
}

const itemSchema = z.object({
	itemId: z.string().min(1).max(80).optional(),
	name: z.string().min(1).max(60),
	type: z.enum(["fixed", "percent"]),
	amount: z.number().optional(),
	percent: z.number().optional(),
	done: z.boolean().optional(),
});

const budgetSchema = z.object({
	income: z.number().positive(),
	items: z.array(itemSchema).min(0),
});

const router = express.Router();

function parseBudgetBody(raw) {
	const income = toNumberOrNull(raw?.income);
	const itemsRaw = Array.isArray(raw?.items) ? raw.items : [];

	const parsedItems = itemsRaw
		.map((it) => ({
			itemId: it?.itemId ? String(it.itemId).trim() : undefined,
			name: String(it?.name ?? "").trim(),
			type: String(it?.type ?? "fixed"),
			amount: toNumberOrUndefined(it?.amount),
			percent: toNumberOrUndefined(it?.percent),
			done: Boolean(it?.done),
		}))
		.filter((it) => it.name.length > 0);

	const validated = budgetSchema.safeParse({ income, items: parsedItems });
	if (!validated.success) {
		return {
			ok: false,
			status: 400,
			body: {
				error: "Invalid budget payload",
				details: validated.error.flatten(),
			},
		};
	}

	const { items } = validated.data;

	for (const item of items) {
		const saveItem = isSaveName(item.name);

		if (!saveItem && item.type !== "fixed") {
			return {
				ok: false,
				status: 400,
				body: {
					error: `Only Save/Savings items can be percent-based. Offending item: "${item.name}"`,
				},
			};
		}

		if (item.type === "fixed") {
			if (!Number.isFinite(item.amount) || item.amount < 0) {
				return {
					ok: false,
					status: 400,
					body: {
						error: `Fixed item "${item.name}" needs a valid amount`,
					},
				};
			}
		}

		if (item.type === "percent") {
			if (
				!Number.isFinite(item.percent) ||
				item.percent < 0 ||
				item.percent > 100
			) {
				return {
					ok: false,
					status: 400,
					body: {
						error: `Percent item "${item.name}" needs percent 0-100`,
					},
				};
			}
		}
	}

	return { ok: true, budget: { income, items } };
}

router.get("/", async (req, res) => {
	const clientId = getClientId(req);
	try {
		const budget = await getBudget(clientId);
		res.json(budget || { income: 0, items: [] });
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[budget] GET failed:", err?.message);
		res.status(500).json({ error: "Failed to fetch budget" });
	}
});

router.get("/history", async (req, res) => {
	const clientId = getClientId(req);
	try {
		const budgets = await getBudgetHistory(clientId);
		const list = budgets.map((b) => ({
			id: b._id,
			income: b.income,
			items: b.items,
			itemCount: Array.isArray(b.items) ? b.items.length : 0,
			createdAt: b.createdAt,
			summary: computeSummary(b),
		}));
		res.json(list);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[budget] history failed:", err?.message);
		res.status(500).json({ error: "Failed to fetch budget history" });
	}
});

router.get("/summary", async (req, res) => {
	const clientId = getClientId(req);
	try {
		const budget = await getBudget(clientId);
		const summary = computeSummary(budget || { income: 0, items: [] });
		res.json(summary);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[budget] summary failed:", err?.message);
		res.status(500).json({ error: "Failed to fetch budget summary" });
	}
});

router.get("/:id", async (req, res) => {
	const clientId = getClientId(req);
	try {
		const budget = await getBudgetById(req.params.id, clientId);
		if (!budget) return res.status(404).json({ error: "Budget not found" });
		res.json({
			...budget.toObject(),
			summary: computeSummary(budget),
		});
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[budget] GET by id failed:", err?.message);
		res.status(500).json({ error: "Failed to fetch budget" });
	}
});

router.put("/current", async (req, res) => {
	const clientId = getClientId(req);
	const parsed = parseBudgetBody(req.body || {});
	if (!parsed.ok) return res.status(parsed.status).json(parsed.body);

	try {
		const latest = await getBudget(clientId);
		if (!latest?._id) {
			return res.status(404).json({
				error: "No saved budget yet. Save your plan first.",
			});
		}

		const saved = await updateBudgetById(
			latest._id,
			parsed.budget,
			clientId,
		);
		if (!saved) return res.status(404).json({ error: "Budget not found" });

		return res.json({
			budget: saved,
			summary: computeSummary(saved),
		});
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("[budget] PUT current failed:", err?.message);
		return res
			.status(500)
			.json({ error: "Failed to update budget", details: err?.message });
	}
});

router.post("/", async (req, res) => {
	const raw = req.body || {};
	console.error("[budget] POST received:", JSON.stringify(raw));

	const parsed = parseBudgetBody(raw);
	if (!parsed.ok) {
		console.error("[budget] validation failed:", parsed.body);
		return res.status(parsed.status).json(parsed.body);
	}

	const budget = parsed.budget;
	console.error("[budget] saving budget:", JSON.stringify(budget));
	const clientId = getClientId(req);
	try {
		const saved = await createBudget(budget, clientId);
		console.error("[budget] saved successfully:", JSON.stringify(saved));
		return res.json({
			budget: saved,
			summary: computeSummary(saved),
		});
	} catch (err) {
		console.error("[budget] save failed:", err?.message || err);
		const duplicateClient =
			err?.code === 11000 && String(err?.message || "").includes("clientId");
		if (duplicateClient) {
			return res.status(409).json({
				error:
					"Could not save another budget yet. Restart the server once so database indexes can update, then try again.",
			});
		}
		return res
			.status(500)
			.json({ error: "Failed to save budget", details: err?.message });
	}
});

module.exports = router;
