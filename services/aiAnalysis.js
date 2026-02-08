const Anthropic = require("@anthropic-ai/sdk");
require("dotenv").config();

let client;

function getClient() {
  if (!client && process.env.CLAUDE_API_KEY) {
    client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return client;
}

async function analyzeWithClaude(prompt) {
  const c = getClient();
  if (!c) {
    console.log("Claude API not configured, returning mock analysis");
    return null;
  }

  const message = await c.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].text;
}

async function detectAnomalies(recentTxs) {
  if (!recentTxs || recentTxs.length === 0) {
    return { anomalyDetected: false, severity: "low", description: "No transactions to analyze", recommendation: "N/A" };
  }

  const txSummary = recentTxs.map((tx) => ({
    txHash: tx.tx_hash,
    amount: tx.amount,
    direction: tx.bridge_direction,
    status: tx.status,
    timestamp: tx.timestamp,
  }));

  const prompt = `You are a blockchain bridge monitoring AI. Analyze these recent opBNB bridge transactions and detect any anomalies.

Transactions:
${JSON.stringify(txSummary, null, 2)}

Look for:
- Unusual delays (gaps between timestamps)
- High failure rates
- Suspiciously large amounts
- Unusual patterns in bridge direction

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "anomalyDetected": boolean,
  "severity": "low" | "medium" | "high",
  "description": "string describing what was found",
  "recommendation": "string with actionable advice"
}`;

  try {
    const response = await analyzeWithClaude(prompt);
    if (!response) {
      return { anomalyDetected: false, severity: "low", description: "AI analysis unavailable", recommendation: "Configure Claude API key" };
    }
    return JSON.parse(response);
  } catch (err) {
    console.error("AI anomaly detection error:", err.message);
    return { anomalyDetected: false, severity: "low", description: "Analysis failed", recommendation: "Check AI service" };
  }
}

async function predictDelay(recentTxs) {
  if (!recentTxs || recentTxs.length < 2) {
    return { estimatedMinutes: 7, confidence: "low", reasoning: "Insufficient data" };
  }

  const txSummary = recentTxs.slice(0, 10).map((tx) => ({
    amount: tx.amount,
    direction: tx.bridge_direction,
    timestamp: tx.timestamp,
    status: tx.status,
  }));

  const prompt = `You are a blockchain bridge monitoring AI. Based on these recent bridge transactions, predict the expected delay for a new bridge transaction.

Recent transactions:
${JSON.stringify(txSummary, null, 2)}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "estimatedMinutes": number,
  "confidence": "low" | "medium" | "high",
  "reasoning": "string explaining the prediction"
}`;

  try {
    const response = await analyzeWithClaude(prompt);
    if (!response) return { estimatedMinutes: 7, confidence: "low", reasoning: "AI unavailable" };
    return JSON.parse(response);
  } catch (err) {
    return { estimatedMinutes: 7, confidence: "low", reasoning: "Prediction failed" };
  }
}

async function suggestOptimalTime(recentTxs) {
  if (!recentTxs || recentTxs.length < 5) {
    return { suggestion: "Insufficient data for optimization", bestTimeWindow: "N/A", reasoning: "Need more historical data" };
  }

  const txSummary = recentTxs.slice(0, 30).map((tx) => ({
    amount: tx.amount,
    direction: tx.bridge_direction,
    timestamp: tx.timestamp,
    status: tx.status,
  }));

  const prompt = `You are a blockchain bridge monitoring AI. Based on these historical bridge transactions, suggest the optimal time to bridge assets.

Historical transactions:
${JSON.stringify(txSummary, null, 2)}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "suggestion": "string with the recommendation",
  "bestTimeWindow": "string like 'UTC 02:00-06:00'",
  "reasoning": "string explaining why"
}`;

  try {
    const response = await analyzeWithClaude(prompt);
    if (!response) return { suggestion: "AI unavailable", bestTimeWindow: "N/A", reasoning: "Configure API key" };
    return JSON.parse(response);
  } catch (err) {
    return { suggestion: "Analysis failed", bestTimeWindow: "N/A", reasoning: "Check AI service" };
  }
}

module.exports = { detectAnomalies, predictDelay, suggestOptimalTime };
