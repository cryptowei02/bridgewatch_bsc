const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DB_PATH = process.env.DATABASE_URL || "./data/bridgewatch.db";

let db;

function init() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  const schema = fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8");
  db.exec(schema);

  console.log(`Database initialized at ${DB_PATH}`);
  return db;
}

function getDb() {
  if (!db) init();
  return db;
}

// --- Bridge Transactions ---

function insertTransaction(tx) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO bridge_transactions
      (tx_hash, event_type, from_address, to_address, amount, bridge_direction, block_number, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    tx.txHash, tx.eventType, tx.from, tx.to,
    tx.amount, tx.bridgeDirection, tx.blockNumber, tx.timestamp, tx.status || "pending"
  );
}

function updateTransactionAttestation(txHash, attestationTxHash) {
  const stmt = getDb().prepare(`
    UPDATE bridge_transactions SET attestation_tx_hash = ?, status = 'completed' WHERE tx_hash = ?
  `);
  return stmt.run(attestationTxHash, txHash);
}

function getTransaction(txHash) {
  return getDb().prepare("SELECT * FROM bridge_transactions WHERE tx_hash = ?").get(txHash);
}

function getRecentTransactions(limit = 50, offset = 0, filters = {}) {
  let query = "SELECT * FROM bridge_transactions WHERE 1=1";
  const params = [];

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.direction) {
    query += " AND bridge_direction = ?";
    params.push(filters.direction);
  }

  query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return getDb().prepare(query).all(...params);
}

function getStats() {
  const d = getDb();
  const total = d.prepare("SELECT COUNT(*) as count FROM bridge_transactions").get().count;
  const completed = d.prepare("SELECT COUNT(*) as count FROM bridge_transactions WHERE status = 'completed'").get().count;
  const failed = d.prepare("SELECT COUNT(*) as count FROM bridge_transactions WHERE status = 'failed'").get().count;
  const avgAmount = d.prepare("SELECT AVG(CAST(amount AS REAL)) as avg FROM bridge_transactions").get().avg || 0;

  return {
    totalTransactions: total,
    completedTransactions: completed,
    failedTransactions: failed,
    successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00",
    averageAmount: avgAmount.toString(),
  };
}

function getVolumeOverTime(timeframe = "24h") {
  const now = Math.floor(Date.now() / 1000);
  let since, groupBy;

  switch (timeframe) {
    case "7d":
      since = now - 7 * 86400;
      groupBy = "strftime('%Y-%m-%d', timestamp, 'unixepoch')";
      break;
    case "30d":
      since = now - 30 * 86400;
      groupBy = "strftime('%Y-%m-%d', timestamp, 'unixepoch')";
      break;
    default: // 24h
      since = now - 86400;
      groupBy = "strftime('%Y-%m-%d %H:00', timestamp, 'unixepoch')";
  }

  return getDb().prepare(`
    SELECT ${groupBy} as period,
           COUNT(*) as count,
           SUM(CAST(amount AS REAL)) as volume
    FROM bridge_transactions
    WHERE timestamp >= ?
    GROUP BY period
    ORDER BY period ASC
  `).all(since);
}

// --- AI Analysis ---

function insertAnalysis(analysis) {
  const stmt = getDb().prepare(`
    INSERT INTO ai_analysis (analysis_type, input_data, result, severity)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(analysis.type, JSON.stringify(analysis.inputData), JSON.stringify(analysis.result), analysis.severity);
}

function getRecentAnalyses(limit = 20) {
  return getDb().prepare("SELECT * FROM ai_analysis ORDER BY created_at DESC LIMIT ?").all(limit);
}

function getLatestAnalysisByType(type, maxAgeSec = 300) {
  const minTime = Math.floor(Date.now() / 1000) - maxAgeSec;
  const row = getDb().prepare(
    "SELECT * FROM ai_analysis WHERE analysis_type = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1"
  ).get(type, minTime);
  if (!row) return null;
  try {
    return JSON.parse(row.result);
  } catch {
    return null;
  }
}

// --- Alerts ---

function insertAlert(alert) {
  const stmt = getDb().prepare(`
    INSERT INTO alerts (alert_type, message, severity, related_tx_hash)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(alert.type, alert.message, alert.severity, alert.relatedTxHash || null);
}

function getAlerts(filters = {}) {
  let query = "SELECT * FROM alerts WHERE 1=1";
  const params = [];

  if (filters.severity) {
    query += " AND severity = ?";
    params.push(filters.severity);
  }
  if (filters.unreadOnly) {
    query += " AND is_read = 0";
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(filters.limit || 50);

  return getDb().prepare(query).all(...params);
}

function markAlertRead(id) {
  return getDb().prepare("UPDATE alerts SET is_read = 1 WHERE id = ?").run(id);
}

// --- Agent Conversations ---

function insertConversationMessage(msg) {
  const stmt = getDb().prepare(`
    INSERT INTO agent_conversations (conversation_id, role, content, tool_calls)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(
    msg.conversationId, msg.role, msg.content,
    msg.toolCalls ? JSON.stringify(msg.toolCalls) : null
  );
}

function getConversationMessages(conversationId, limit = 100) {
  return getDb().prepare(
    "SELECT * FROM agent_conversations WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?"
  ).all(conversationId, limit);
}

function getRecentConversations(limit = 20) {
  return getDb().prepare(`
    SELECT conversation_id, MAX(created_at) as last_active, COUNT(*) as message_count
    FROM agent_conversations
    GROUP BY conversation_id
    ORDER BY last_active DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  init,
  getDb,
  insertTransaction,
  updateTransactionAttestation,
  getTransaction,
  getRecentTransactions,
  getStats,
  getVolumeOverTime,
  insertAnalysis,
  getRecentAnalyses,
  getLatestAnalysisByType,
  insertAlert,
  getAlerts,
  markAlertRead,
  insertConversationMessage,
  getConversationMessages,
  getRecentConversations,
};
