const mongoose = require("mongoose");
const { Budget, Reminder } = require("./models");

async function initDb() {
	if (mongoose.connection.readyState !== 1) {
		const uri = process.env.MONGODB_URI;
		if (!uri) {
			throw new Error("MONGODB_URI environment variable not set");
		}
		await mongoose.connect(uri);
		// eslint-disable-next-line no-console
		console.log(
			`[db] connected to MongoDB (${mongoose.connection.name || "default"})`,
		);
	}

	await migrateBudgetIndexes();
}

async function migrateBudgetIndexes() {
	try {
		const indexes = await Budget.collection.indexes();
		for (const idx of indexes) {
			if (idx.key?.clientId === 1 && idx.unique) {
				await Budget.collection.dropIndex(idx.name);
				// eslint-disable-next-line no-console
				console.log(
					`[db] dropped legacy unique index "${idx.name}" on budgets.clientId`,
				);
			}
		}
		await Budget.syncIndexes();
	} catch (err) {
		// eslint-disable-next-line no-console
		console.warn("[db] budget index migration:", err?.message || err);
	}
}

async function getBudget(clientId) {
	const query = clientId ? { clientId } : {};
	return await Budget.findOne(query).sort({ createdAt: -1 });
}

async function createBudget(budget, clientId) {
	const payload = clientId ? Object.assign({}, budget, { clientId }) : budget;
	return await Budget.create(payload);
}

async function getBudgetHistory(clientId) {
	const query = clientId ? { clientId } : {};
	return await Budget.find(query).sort({ createdAt: -1 });
}

async function getBudgetById(id, clientId) {
	const query = { _id: id };
	if (clientId) query.clientId = clientId;
	return await Budget.findOne(query);
}

async function updateBudgetById(id, budget, clientId) {
	const query = { _id: id };
	if (clientId) query.clientId = clientId;
	return await Budget.findOneAndUpdate(query, budget, { new: true });
}

function getReminders() {
	// Synchronous method for scheduler; actual data is fetched asynchronously
	return [];
}

async function getRemindersAsync(clientId) {
	const query = {};
	if (clientId) {
		query.clientId = clientId;
	}
	return await Reminder.find(query);
}

async function addReminder(reminder, clientId) {
	const payload = clientId ? Object.assign({}, reminder, { clientId }) : reminder;
	return await Reminder.create(payload);
}

async function updateReminder(id, patch, clientId) {
	const query = { id };
	if (clientId) query.clientId = clientId;
	return await Reminder.findOneAndUpdate(query, patch, { new: true });
}

async function deleteReminder(id, clientId) {
	const query = { id };
	if (clientId) query.clientId = clientId;
	const result = await Reminder.findOneAndDelete(query);
	return result ? true : false;
}

async function markReminderSent(id) {
	const now = new Date().toISOString();
	return updateReminder(id, { sentAt: now, status: "sent" });
}

module.exports = {
	initDb,
	getBudget,
	createBudget,
	getBudgetHistory,
	getBudgetById,
	updateBudgetById,
	getReminders,
	getRemindersAsync,
	addReminder,
	updateReminder,
	deleteReminder,
	markReminderSent,
};
