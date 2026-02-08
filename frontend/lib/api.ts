const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface Transaction {
  id: number;
  tx_hash: string;
  event_type: string;
  from_address: string;
  to_address: string;
  amount: string;
  bridge_direction: string;
  block_number: number;
  timestamp: number;
  attestation_tx_hash: string | null;
  status: string;
  created_at: number;
}

export interface Alert {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  related_tx_hash: string | null;
  is_read: number;
  created_at: number;
}

export interface Stats {
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  successRate: string;
  averageAmount: string;
}

export interface VolumeData {
  period: string;
  count: number;
  volume: number;
}

export interface AnomalyResult {
  anomalyDetected: boolean;
  severity: string;
  description: string;
  recommendation: string;
}

export interface DelayResult {
  estimatedMinutes: number;
  confidence: string;
  reasoning: string;
}

export interface OptimalTimeResult {
  suggestion: string;
  bestTimeWindow: string;
  reasoning: string;
}

export async function getTransactions(limit = 50, offset = 0) {
  return fetchAPI<{ transactions: Transaction[]; limit: number; offset: number }>(
    `/transactions?limit=${limit}&offset=${offset}`
  );
}

export async function getTransaction(txHash: string) {
  return fetchAPI<Transaction>(`/transactions/${txHash}`);
}

export async function getReceipt(txHash: string) {
  return fetchAPI<{ transaction: Transaction; onChainReceipt: unknown; attestationTxHash: string | null }>(
    `/receipt/${txHash}`
  );
}

export async function getAlerts(limit = 50) {
  return fetchAPI<{ alerts: Alert[] }>(`/alerts?limit=${limit}`);
}

export async function getStats() {
  return fetchAPI<Stats>("/analytics/stats");
}

export async function getVolume(timeframe = "24h") {
  return fetchAPI<{ timeframe: string; data: VolumeData[] }>(`/analytics/volume?timeframe=${timeframe}`);
}

export async function getInsights() {
  return fetchAPI<{ anomalies: AnomalyResult; delay: DelayResult; optimalTime: OptimalTimeResult }>(
    "/analytics/insights"
  );
}

export async function getHealth() {
  return fetchAPI<{ status: string; timestamp: number; service: string }>("/health");
}
