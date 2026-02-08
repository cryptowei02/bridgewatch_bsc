const database = require("../services/database");
const { ethers } = require("ethers");

function randomAddress() {
  return ethers.Wallet.createRandom().address;
}

function randomAmount() {
  const amounts = ["0.1", "0.5", "1.0", "2.5", "5.0", "10.0", "0.05", "0.25"];
  return ethers.parseEther(amounts[Math.floor(Math.random() * amounts.length)]).toString();
}

function seed() {
  database.init();
  console.log("Seeding test data...");

  const now = Math.floor(Date.now() / 1000);
  const directions = ["BSC->opBNB", "opBNB->BSC"];
  const statuses = ["completed", "completed", "completed", "completed", "pending", "failed"];
  const eventTypes = ["DepositFinalized", "WithdrawalInitiated"];

  // Insert 50 sample transactions
  for (let i = 0; i < 50; i++) {
    const dirIdx = Math.floor(Math.random() * 2);
    const tx = {
      txHash: ethers.keccak256(ethers.toUtf8Bytes(`seed-tx-${i}-${Date.now()}`)),
      eventType: eventTypes[dirIdx],
      from: randomAddress(),
      to: randomAddress(),
      amount: randomAmount(),
      bridgeDirection: directions[dirIdx],
      blockNumber: 1000000 + i * 100,
      timestamp: now - (50 - i) * 600, // every 10 minutes
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
    database.insertTransaction(tx);
  }
  console.log("  Inserted 50 sample transactions");

  // Insert sample alerts
  const alertSamples = [
    { type: "anomaly", message: "Unusually high bridge volume detected in the last hour", severity: "medium" },
    { type: "delay", message: "Average confirmation time increased to 15 minutes", severity: "low" },
    { type: "anomaly", message: "3 consecutive failed transactions from same address", severity: "high" },
    { type: "optimization", message: "Best time to bridge: UTC 02:00-06:00 (lowest gas)", severity: "low" },
    { type: "anomaly", message: "Bridge volume dropped 60% compared to yesterday", severity: "medium" },
  ];

  for (const alert of alertSamples) {
    database.insertAlert(alert);
  }
  console.log("  Inserted 5 sample alerts");

  // Insert sample AI analyses
  const analyses = [
    {
      type: "anomaly",
      inputData: { txCount: 20, timeWindow: "1h" },
      result: { anomalyDetected: false, severity: "low", description: "All metrics normal" },
      severity: "low",
    },
    {
      type: "delay_prediction",
      inputData: { avgConfirmTime: 420 },
      result: { estimatedMinutes: 7, confidence: "medium", reasoning: "Based on 20 recent txs" },
      severity: null,
    },
  ];

  for (const a of analyses) {
    database.insertAnalysis(a);
  }
  console.log("  Inserted 2 sample AI analyses");

  const stats = database.getStats();
  console.log("\nDatabase stats:", stats);
  console.log("Seeding complete!");
}

seed();
