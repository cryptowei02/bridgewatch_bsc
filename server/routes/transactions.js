const express = require("express");
const database = require("../../services/database");

const router = express.Router();

// GET /api/transactions - List recent transactions
router.get("/", (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.direction) filters.direction = req.query.direction;

    const transactions = database.getRecentTransactions(limit, offset, filters);
    res.json({ transactions, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:txHash - Get single transaction
router.get("/:txHash", (req, res) => {
  try {
    const tx = database.getTransaction(req.params.txHash);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
