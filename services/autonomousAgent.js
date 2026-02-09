const database = require("./database");
const aiAnalysis = require("./aiAnalysis");
require("dotenv").config();

const CHECK_INTERVAL = parseInt(process.env.AGENT_CHECK_INTERVAL) || 60000;
let intervalHandle;
let running = false;

async function start() {
  database.init();
  console.log("Starting BridgeWatch Autonomous Agent...");
  console.log(`Check interval: ${CHECK_INTERVAL / 1000}s`);

  await runCheck();

  intervalHandle = setInterval(async () => {
    if (running) {
      console.log("Previous check still running, skipping...");
      return;
    }
    await runCheck();
  }, CHECK_INTERVAL);
}

async function runCheck() {
  running = true;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Running autonomous check...`);

  try {
    const recentTxs = database.getRecentTransactions(30);

    if (recentTxs.length === 0) {
      console.log(`[${timestamp}] No transactions to analyze`);
      running = false;
      return;
    }

    // 1. Anomaly detection
    const anomalyResult = await aiAnalysis.detectAnomalies(recentTxs);

    if (anomalyResult && anomalyResult.anomalyDetected) {
      console.log(`[${timestamp}] ANOMALY DETECTED [${anomalyResult.severity}]: ${anomalyResult.description}`);

      database.insertAlert({
        type: "autonomous_agent_anomaly",
        message: `[Auto-Agent] ${anomalyResult.description}`,
        severity: anomalyResult.severity,
        relatedTxHash: recentTxs[0]?.tx_hash || null,
      });

      database.insertAnalysis({
        type: "autonomous_anomaly",
        inputData: { txCount: recentTxs.length, trigger: "scheduled_check" },
        result: anomalyResult,
        severity: anomalyResult.severity,
      });
    } else {
      console.log(`[${timestamp}] No anomalies detected`);
    }

    // 2. Check failure rate
    const stats = database.getStats();
    const failureRate = stats.totalTransactions > 0
      ? (stats.failedTransactions / stats.totalTransactions) * 100
      : 0;

    if (failureRate > 20 && stats.totalTransactions >= 5) {
      console.log(`[${timestamp}] HIGH FAILURE RATE: ${failureRate.toFixed(1)}%`);

      database.insertAlert({
        type: "autonomous_agent_failure_rate",
        message: `[Auto-Agent] High failure rate: ${failureRate.toFixed(1)}% (${stats.failedTransactions}/${stats.totalTransactions})`,
        severity: failureRate > 50 ? "high" : "medium",
        relatedTxHash: null,
      });
    }

    // 3. Check stale pending transactions (> 30 min)
    const pendingTxs = database.getRecentTransactions(50, 0, { status: "pending" });
    const thirtyMinAgo = Math.floor(Date.now() / 1000) - 1800;
    const stalePending = pendingTxs.filter((tx) => tx.timestamp < thirtyMinAgo);

    if (stalePending.length > 0) {
      console.log(`[${timestamp}] ${stalePending.length} stale pending transaction(s)`);

      database.insertAlert({
        type: "autonomous_agent_stale_pending",
        message: `[Auto-Agent] ${stalePending.length} transaction(s) pending over 30 minutes`,
        severity: stalePending.length > 5 ? "high" : "medium",
        relatedTxHash: stalePending[0]?.tx_hash || null,
      });
    }

    console.log(`[${timestamp}] Check complete`);
  } catch (err) {
    console.error(`[${timestamp}] Autonomous check error:`, err.message);
  } finally {
    running = false;
  }
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  console.log("Autonomous agent stopped");
}

if (require.main === module) {
  start().catch(console.error);

  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });
}

module.exports = { start, stop, runCheck };
