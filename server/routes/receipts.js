const express = require("express");
const database = require("../../services/database");
const attestation = require("../../services/attestation");

const router = express.Router();

// GET /api/receipt/:txHash - Get attestation receipt
router.get("/:txHash", async (req, res) => {
  try {
    // Get from database first
    const dbTx = database.getTransaction(req.params.txHash);
    if (!dbTx) return res.status(404).json({ error: "Transaction not found" });

    // Try to get on-chain receipt
    const onChainReceipt = await attestation.getReceipt(req.params.txHash);

    res.json({
      transaction: dbTx,
      onChainReceipt: onChainReceipt || null,
      attestationTxHash: dbTx.attestation_tx_hash || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
