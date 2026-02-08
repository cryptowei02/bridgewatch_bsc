const { ethers } = require("ethers");
require("dotenv").config();

const ATTESTATION_ABI = [
  "function createReceipt(bytes32 _txHash, address _from, address _to, uint256 _amount, string _bridgeDirection) external",
  "function verifyReceipt(bytes32 _txHash) external",
  "function getReceipt(bytes32 _txHash) external view returns (tuple(bytes32 txHash, address from, address to, uint256 amount, uint256 timestamp, uint256 blockNumber, string bridgeDirection, bool verified))",
  "function getRecentReceipts(uint256 _count) external view returns (tuple(bytes32 txHash, address from, address to, uint256 amount, uint256 timestamp, uint256 blockNumber, string bridgeDirection, bool verified)[])",
  "function getTotalReceipts() external view returns (uint256)",
];

let bscContract, opbnbContract;

function isValidAddress(addr) {
  return addr && /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function getContracts() {
  try {
    if (!bscContract && isValidAddress(process.env.ATTESTATION_CONTRACT_BSC) && process.env.ATTESTATION_PRIVATE_KEY && process.env.BSC_RPC_URL) {
      const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
      const bscWallet = new ethers.Wallet(process.env.ATTESTATION_PRIVATE_KEY, bscProvider);
      bscContract = new ethers.Contract(process.env.ATTESTATION_CONTRACT_BSC, ATTESTATION_ABI, bscWallet);
    }
    if (!opbnbContract && isValidAddress(process.env.ATTESTATION_CONTRACT_OPBNB) && process.env.ATTESTATION_PRIVATE_KEY && process.env.OPBNB_HTTP_RPC_URL) {
      const opbnbProvider = new ethers.JsonRpcProvider(process.env.OPBNB_HTTP_RPC_URL);
      const opbnbWallet = new ethers.Wallet(process.env.ATTESTATION_PRIVATE_KEY, opbnbProvider);
      opbnbContract = new ethers.Contract(process.env.ATTESTATION_CONTRACT_OPBNB, ATTESTATION_ABI, opbnbWallet);
    }
  } catch (err) {
    console.error("Failed to initialize attestation contracts:", err.message);
  }
  return { bscContract, opbnbContract };
}

async function createOnChainReceipt(tx, retries = 3) {
  const { bscContract } = getContracts();
  if (!bscContract) {
    console.log("Attestation contract not configured, skipping on-chain receipt");
    return null;
  }

  const txHashBytes32 = ethers.zeroPadValue(ethers.getBytes(tx.txHash.slice(0, 66)), 32);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const gasEstimate = await bscContract.createReceipt.estimateGas(
        txHashBytes32, tx.from, tx.to, tx.amount, tx.bridgeDirection
      );

      const receipt = await bscContract.createReceipt(
        txHashBytes32, tx.from, tx.to, tx.amount, tx.bridgeDirection,
        { gasLimit: gasEstimate * 120n / 100n }
      );

      const result = await receipt.wait();
      return { hash: result.hash, blockNumber: result.blockNumber };
    } catch (err) {
      console.error(`Attestation attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  return null;
}

async function getReceipt(txHash) {
  const { bscContract } = getContracts();
  if (!bscContract) return null;

  try {
    const txHashBytes32 = ethers.zeroPadValue(ethers.getBytes(txHash.slice(0, 66)), 32);
    const receipt = await bscContract.getReceipt(txHashBytes32);
    return {
      txHash: receipt.txHash,
      from: receipt.from,
      to: receipt.to,
      amount: receipt.amount.toString(),
      timestamp: Number(receipt.timestamp),
      blockNumber: Number(receipt.blockNumber),
      bridgeDirection: receipt.bridgeDirection,
      verified: receipt.verified,
    };
  } catch (err) {
    return null;
  }
}

async function getRecentOnChainReceipts(count = 10) {
  const { bscContract } = getContracts();
  if (!bscContract) return [];

  try {
    const receipts = await bscContract.getRecentReceipts(count);
    return receipts.map((r) => ({
      txHash: r.txHash,
      from: r.from,
      to: r.to,
      amount: r.amount.toString(),
      timestamp: Number(r.timestamp),
      blockNumber: Number(r.blockNumber),
      bridgeDirection: r.bridgeDirection,
      verified: r.verified,
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { createOnChainReceipt, getReceipt, getRecentOnChainReceipts };
