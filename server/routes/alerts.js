const express = require("express");
const database = require("../../services/database");

const router = express.Router();

// GET /api/alerts - Get recent alerts
router.get("/", (req, res) => {
  try {
    const filters = {};
    if (req.query.severity) filters.severity = req.query.severity;
    if (req.query.unread_only === "true") filters.unreadOnly = true;
    filters.limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const alerts = database.getAlerts(filters);
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:id/read - Mark alert as read
router.patch("/:id/read", (req, res) => {
  try {
    database.markAlertRead(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
