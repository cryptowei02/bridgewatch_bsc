const { ethers } = require("ethers");
const database = require("../services/database");
require("dotenv").config();

const BRIDGE_CONTRACT = "0x4200000000000000000000000000000000000010";
const RPC_URL = "https://opbnb-mainnet-rpc.bnbchain.org";

const BRIDGE_ABI = [
  "event DepositFinalized(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData)",
  "event WithdrawalInitiated(address indexed l1Token, address indexed l2Token, address indexed from, address to, uint256 amount, bytes extraData)",
];

async function fetchHistory() {
  database.init();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(BRIDGE_CONTRACT, BRIDGE_ABI, provider);

  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);

  // Scan last ~2.5 days (200,000 blocks at ~1s/block)
  const CHUNK_SIZE = 5000;
  const RANGE = 200000;
  const START_BLOCK = currentBlock - RANGE;
  let totalDeposits = 0;
  let totalWithdrawals = 0;

  for (let from = START_BLOCK; from < currentBlock; from += CHUNK_SIZE) {
    const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
    process.stdout.write(`Scanning ${from}-${to}...`);

    try {
      const deposits = await contract.queryFilter("DepositFinalized", from, to);
      for (const event of deposits) {
        const [l1Token, , sender, recipient, amount] = event.args;
        const block = await event.getBlock();
        const isNative = l1Token === "0x0000000000000000000000000000000000000000";
        database.insertTransaction({
          txHash: event.transactionHash,
          eventType: "DepositFinalized",
          from: sender,
          to: recipient,
          amount: amount.toString(),
          bridgeDirection: "BSC->opBNB",
          blockNumber: event.blockNumber,
          timestamp: block.timestamp,
          status: "completed",
        });
        totalDeposits++;
        console.log(`\n  Deposit: ${event.transactionHash} | ${ethers.formatEther(amount)} ${isNative ? "BNB" : "Token"}`);
      }

      const withdrawals = await contract.queryFilter("WithdrawalInitiated", from, to);
      for (const event of withdrawals) {
        const [l1Token, , sender, recipient, amount] = event.args;
        const block = await event.getBlock();
        const isNative = l1Token === "0x0000000000000000000000000000000000000000";
        database.insertTransaction({
          txHash: event.transactionHash,
          eventType: "WithdrawalInitiated",
          from: sender,
          to: recipient,
          amount: amount.toString(),
          bridgeDirection: "opBNB->BSC",
          blockNumber: event.blockNumber,
          timestamp: block.timestamp,
          status: "completed",
        });
        totalWithdrawals++;
        console.log(`\n  Withdrawal: ${event.transactionHash} | ${ethers.formatEther(amount)} ${isNative ? "BNB" : "Token"}`);
      }

      if (deposits.length === 0 && withdrawals.length === 0) process.stdout.write(" empty\n");
    } catch (err) {
      console.log(` error: ${err.message}`);
    }
  }

  console.log(`\nDone! ${totalDeposits} deposits + ${totalWithdrawals} withdrawals = ${totalDeposits + totalWithdrawals} total`);
  console.log("Stats:", database.getStats());
}

fetchHistory().catch(console.error);
