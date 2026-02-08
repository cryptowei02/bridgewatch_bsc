import { ethers } from "ethers";

export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function shortenTxHash(hash: string): string {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export function formatAmount(weiAmount: string): string {
  try {
    return parseFloat(ethers.formatEther(weiAmount)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export function timeAgo(ts: number): string {
  const seconds = Math.floor(Date.now() / 1000 - ts);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "text-red-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-green-400";
    default:
      return "text-gray-400";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-400";
    case "pending":
      return "text-yellow-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function statusBg(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-400/10 border-green-400/20";
    case "pending":
      return "bg-yellow-400/10 border-yellow-400/20";
    case "failed":
      return "bg-red-400/10 border-red-400/20";
    default:
      return "bg-gray-400/10 border-gray-400/20";
  }
}

export function bscscanTx(hash: string): string {
  return `https://bscscan.com/tx/${hash}`;
}

export function bscscanAddress(address: string): string {
  return `https://bscscan.com/address/${address}`;
}
