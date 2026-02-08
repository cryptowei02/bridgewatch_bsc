const { ethers } = require("ethers");
const database = require("./database");
const attestation = require("./attestation");
const aiAnalysis = require("./aiAnalysis");
require("dotenv").config();

const BRIDGE_CONTRACT = process.env.OPBNB_BRIDGE_CONTRACT || "0x4200000000000000000000000000000000000010";
const RPC_URL = process.env.OPBNB_RPC_URL || "wss://opbnb-testnet.nodereal.io/ws/v1/YOUR_API_KEY";

// OP Stack L2StandardBridge event signatures
const BRIDGE_ABI = [
  "event DepositFinalized(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData)",
  "event WithdrawalInitiated(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData)",
];

let provider;
let contract;
let reconnectTimer;

async function start() {
  database.init();
  console.log("Starting BridgeWatch Event Listener...");
  console.log(`Monitoring bridge contract: ${BRIDGE_CONTRACT}`);
  await connect();
}

async function connect() {
  try {
    if (RPC_URL.startsWith("ws")) {
      provider = new ethers.WebSocketProvider(RPC_URL);
    } else {
      provider = new ethers.JsonRpcProvider(RPC_URL);
    }

    contract = new ethers.Contract(BRIDGE_CONTRACT, BRIDGE_ABI, provider);

    contract.on("DepositFinalized", handleDeposit);
    contract.on("WithdrawalInitiated", handleWithdrawal);

    provider.on("error", (err) => {
      console.error("Provider error:", err.message);
      scheduleReconnect();
    });

    if (provider.websocket) {
      provider.websocket.on("close", () => {
        console.log("WebSocket closed, reconnecting...");
        scheduleReconnect();
      });
    }

    const blockNumber = await provider.getBlockNumber();
    console.log(`Connected! Current block: ${blockNumber}`);
  } catch (err) {
    console.error("Connection failed:", err.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    console.log("Attempting reconnection...");
    cleanup();
    await connect();
  }, 5000);
}

function cleanup() {
  if (contract) {
    contract.removeAllListeners();
  }
  if (provider) {
    provider.removeAllListeners();
    if (provider.destroy) provider.destroy();
  }
}

async function handleDeposit(l1Token, l2Token, from, to, amount, extraData, event) {
  const isNative = l1Token === "0x0000000000000000000000000000000000000000";
  console.log(`DepositFinalized: ${from} -> ${to} | ${ethers.formatEther(amount)} ${isNative ? "BNB" : "Token"}`);

  const tx = {
    txHash: event.log.transactionHash,
    eventType: "DepositFinalized",
    from,
    to,
    amount: amount.toString(),
    bridgeDirection: "BSC->opBNB",
    blockNumber: event.log.blockNumber,
    timestamp: Math.floor(Date.now() / 1000),
    status: "completed",
  };

  try {
    database.insertTransaction(tx);
    console.log(`  Stored in database: ${tx.txHash}`);

    const attResult = await attestation.createOnChainReceipt(tx);
    if (attResult) {
      database.updateTransactionAttestation(tx.txHash, attResult.hash);
      console.log(`  Attestation created: ${attResult.hash}`);
    }

    await runPeriodicAnalysis();
  } catch (err) {
    console.error("  Error processing deposit:", err.message);
  }
}

async function handleWithdrawal(l1Token, l2Token, from, to, amount, extraData, event) {
  const isNative = l1Token === "0x0000000000000000000000000000000000000000";
  console.log(`WithdrawalInitiated: ${from} -> ${to} | ${ethers.formatEther(amount)} ${isNative ? "BNB" : "Token"}`);

  const tx = {
    txHash: event.log.transactionHash,
    eventType: "WithdrawalInitiated",
    from,
    to,
    amount: amount.toString(),
    bridgeDirection: "opBNB->BSC",
    blockNumber: event.log.blockNumber,
    timestamp: Math.floor(Date.now() / 1000),
    status: "completed",
  };

  try {
    database.insertTransaction(tx);
    console.log(`  Stored in database: ${tx.txHash}`);

    const attResult = await attestation.createOnChainReceipt(tx);
    if (attResult) {
      database.updateTransactionAttestation(tx.txHash, attResult.hash);
      console.log(`  Attestation created: ${attResult.hash}`);
    }

    await runPeriodicAnalysis();
  } catch (err) {
    console.error("  Error processing withdrawal:", err.message);
  }
}

let analysisCounter = 0;
async function runPeriodicAnalysis() {
  analysisCounter++;
  if (analysisCounter % 10 !== 0) return;

  try {
    const recentTxs = database.getRecentTransactions(20);
    const analysis = await aiAnalysis.detectAnomalies(recentTxs);

    if (analysis && analysis.anomalyDetected) {
      database.insertAlert({
        type: "anomaly",
        message: analysis.description,
        severity: analysis.severity,
        relatedTxHash: recentTxs[0]?.tx_hash,
      });
      console.log(`  AI Alert [${analysis.severity}]: ${analysis.description}`);
    }
  } catch (err) {
    console.error("  AI analysis error:", err.message);
  }
}

if (require.main === module) {
  start().catch(console.error);
}

module.exports = { start, connect, cleanup };
