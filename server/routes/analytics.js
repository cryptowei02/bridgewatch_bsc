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

// GET /api/analytics/insights - AI insights
router.get("/insights", async (req, res) => {
  try {
    const recentTxs = database.getRecentTransactions(30);

    const [anomalies, delay, optimalTime] = await Promise.all([
      aiAnalysis.detectAnomalies(recentTxs),
      aiAnalysis.predictDelay(recentTxs),
      aiAnalysis.suggestOptimalTime(recentTxs),
    ]);

    res.json({ anomalies, delay, optimalTime });
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
