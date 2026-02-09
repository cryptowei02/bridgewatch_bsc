const express = require("express");
const cors = require("cors");
require("dotenv").config();

const database = require("../services/database");
const transactionsRouter = require("./routes/transactions");
const receiptsRouter = require("./routes/receipts");
const alertsRouter = require("./routes/alerts");
const analyticsRouter = require("./routes/analytics");
const agentRouter = require("./routes/agent");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
database.init();

// Routes
app.use("/api/transactions", transactionsRouter);
app.use("/api/receipt", receiptsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/agent", agentRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), service: "BridgeWatch API" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`BridgeWatch API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
