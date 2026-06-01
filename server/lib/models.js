const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
	{
		// Scopes budgets to this browser/device (many snapshots per client)
		clientId: { type: String, index: true },
		income: Number,
		items: [
			{
				itemId: String,
				name: String,
				type: { type: String, enum: ["fixed", "percent"] },
				amount: Number,
				percent: Number,
				done: { type: Boolean, default: false },
			},
		],
	},
	{ timestamps: true },
);

const reminderSchema = new mongoose.Schema(
	{
		id: { type: String, unique: true, required: true },
		clientId: String,
		title: String,
		message: String,
		toEmail: String,
		scheduledAt: Date,
		status: { type: String, enum: ["pending", "sent"], default: "pending" },
		sentAt: Date,
	},
	{ timestamps: true },
);

const Budget = mongoose.model("Budget", budgetSchema);
const Reminder = mongoose.model("Reminder", reminderSchema);

module.exports = { Budget, Reminder };
