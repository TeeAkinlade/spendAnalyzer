require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { initDb } = require("./lib/db");
const { startReminderScheduler } = require("./lib/scheduler");

const budgetRoutes = require("./routes/budget");
const reminderRoutes = require("./routes/reminders");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
	res.json({ name: "Spend Analyzer API", ok: true });
});

app.use("/api/budget", budgetRoutes);
app.use("/api/reminders", reminderRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	// eslint-disable-next-line no-console
	console.error("[api] error:", err);
	res.status(500).json({ error: err?.message || "Internal server error" });
});

async function start() {
	try {
		await initDb();
		// eslint-disable-next-line no-console
		console.log("[server] database initialized");
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(
			"[server] failed to initialize database:",
			err?.message || err,
		);
		process.exit(1);
	}

	try {
		await startReminderScheduler();
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(
			"[server] failed to start scheduler:",
			err?.message || err,
		);
	}

	const port = Number(process.env.PORT || 3001);
	const server = app.listen(port, () => {
		// eslint-disable-next-line no-console
		console.log(`[server] listening on http://localhost:${port}`);
	});

	server.on("error", (err) => {
		// eslint-disable-next-line no-console
		console.error("[server] listen error:", err?.message || err);
		process.exit(1);
	});
}

start().catch((err) => {
	// eslint-disable-next-line no-console
	console.error("[server] fatal error:", err?.message || err);
	process.exit(1);
});
