const express = require("express");
const database = require("../../services/database");
const aiAnalysis = require("../../services/aiAnalysis");

const router = express.Router();

// GET /api/analytics/stats - Overall statistics
router.get("/stats", (req, res) => {
  try {
    const stats = database.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/volume - Volume over time
router.get("/volume", (req, res) => {
  try {
    const timeframe = req.query.timeframe || "24h";
    const volume = database.getVolumeOverTime(timeframe);
    res.json({ timeframe, data: volume });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cache TTL in seconds (5 minutes)
const INSIGHTS_CACHE_TTL = 300;

// GET /api/analytics/insights - AI insights (cached)
router.get("/insights", async (req, res) => {
  try {
    // Check cache first
    const cachedAnomalies = database.getLatestAnalysisByType("anomalies", INSIGHTS_CACHE_TTL);
    const cachedDelay = database.getLatestAnalysisByType("delay", INSIGHTS_CACHE_TTL);
    const cachedOptimalTime = database.getLatestAnalysisByType("optimalTime", INSIGHTS_CACHE_TTL);

    // If all three are cached, return immediately
    if (cachedAnomalies && cachedDelay && cachedOptimalTime) {
      return res.json({ anomalies: cachedAnomalies, delay: cachedDelay, optimalTime: cachedOptimalTime, cached: true });
    }

    // Otherwise, fetch fresh data from AI
    const recentTxs = database.getRecentTransactions(30);

    const tasks = [
      cachedAnomalies ? Promise.resolve(cachedAnomalies) : aiAnalysis.detectAnomalies(recentTxs),
      cachedDelay ? Promise.resolve(cachedDelay) : aiAnalysis.predictDelay(recentTxs),
      cachedOptimalTime ? Promise.resolve(cachedOptimalTime) : aiAnalysis.suggestOptimalTime(recentTxs),
    ];

    const results = await Promise.allSettled(tasks);

    const anomalies = results[0].status === "fulfilled" ? results[0].value : null;
    const delay = results[1].status === "fulfilled" ? results[1].value : null;
    const optimalTime = results[2].status === "fulfilled" ? results[2].value : null;

    // Cache fresh results
    const inputSummary = { txCount: recentTxs.length };
    if (anomalies && !cachedAnomalies) {
      database.insertAnalysis({ type: "anomalies", inputData: inputSummary, result: anomalies, severity: anomalies.severity || "info" });
    }
    if (delay && !cachedDelay) {
      database.insertAnalysis({ type: "delay", inputData: inputSummary, result: delay, severity: "info" });
    }
    if (optimalTime && !cachedOptimalTime) {
      database.insertAnalysis({ type: "optimalTime", inputData: inputSummary, result: optimalTime, severity: "info" });
    }

    const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason?.message);
    if (errors.length > 0) {
      console.warn("AI analysis partial failure:", errors.join("; "));
    }

    res.json({ anomalies, delay, optimalTime, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/history - AI analysis history
router.get("/history", (req, res) => {
  try {
    const analyses = database.getRecentAnalyses(parseInt(req.query.limit) || 20);
    res.json({ analyses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
