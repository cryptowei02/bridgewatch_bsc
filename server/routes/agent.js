const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const database = require("../../services/database");
const aiAnalysis = require("../../services/aiAnalysis");
const attestation = require("../../services/attestation");
require("dotenv").config();

const router = express.Router();

let client;
function getClient() {
  if (!client && process.env.CLAUDE_API_KEY) {
    client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are BridgeWatch AI Agent, an expert assistant for monitoring and analyzing opBNB bridge transactions between BSC and opBNB chains.

You have access to tools that let you query real bridge data, detect anomalies, predict delays, suggest optimal timing, and create on-chain attestation receipts.

When a user asks a question:
1. Use the appropriate tools to gather real data before answering
2. Present data clearly with specific numbers and transaction details
3. Proactively flag any concerns you notice
4. When showing amounts, convert from wei to BNB (divide by 1e18) for readability

Be concise but thorough. Use the tools — don't guess at data you can look up. Respond in the same language the user uses.`;

const TOOLS = [
  {
    name: "query_transactions",
    description: "Search and list recent bridge transactions. Returns tx hashes, amounts, statuses, directions, timestamps.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of transactions to return (max 200, default 20)" },
        status: { type: "string", enum: ["pending", "completed", "failed"], description: "Filter by status" },
        direction: { type: "string", enum: ["BSC->opBNB", "opBNB->BSC"], description: "Filter by bridge direction" },
      },
      required: [],
    },
  },
  {
    name: "get_stats",
    description: "Get overall bridge statistics: total transactions, completion rate, failure count, average amount.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "analyze_anomalies",
    description: "Run anomaly detection on recent bridge transactions. Checks for unusual delays, high failure rates, suspicious amounts.",
    input_schema: {
      type: "object",
      properties: {
        tx_count: { type: "number", description: "Number of recent transactions to analyze (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "predict_delay",
    description: "Predict expected delay for a new bridge transaction based on recent patterns.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "suggest_optimal_time",
    description: "Suggest the best time window to bridge assets based on historical patterns.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_alerts",
    description: "Fetch recent alerts from the monitoring system.",
    input_schema: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["low", "medium", "high"], description: "Filter by severity" },
        unread_only: { type: "boolean", description: "Only return unread alerts" },
        limit: { type: "number", description: "Number of alerts to return (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "create_attestation_receipt",
    description: "Create an on-chain attestation receipt for a transaction. Writes to blockchain and costs gas.",
    input_schema: {
      type: "object",
      properties: {
        tx_hash: { type: "string", description: "The transaction hash to create an attestation for" },
      },
      required: ["tx_hash"],
    },
  },
];

async function executeTool(name, input) {
  switch (name) {
    case "query_transactions": {
      const limit = Math.min(input.limit || 20, 200);
      const filters = {};
      if (input.status) filters.status = input.status;
      if (input.direction) filters.direction = input.direction;
      const txs = database.getRecentTransactions(limit, 0, filters);
      return { transactions: txs, count: txs.length };
    }
    case "get_stats": {
      return database.getStats();
    }
    case "analyze_anomalies": {
      const txCount = input.tx_count || 20;
      const recentTxs = database.getRecentTransactions(txCount);
      const result = await aiAnalysis.detectAnomalies(recentTxs);
      return result || { error: "Analysis unavailable" };
    }
    case "predict_delay": {
      const recentTxs = database.getRecentTransactions(10);
      const result = await aiAnalysis.predictDelay(recentTxs);
      return result || { error: "Prediction unavailable" };
    }
    case "suggest_optimal_time": {
      const recentTxs = database.getRecentTransactions(30);
      const result = await aiAnalysis.suggestOptimalTime(recentTxs);
      return result || { error: "Suggestion unavailable" };
    }
    case "get_alerts": {
      const filters = {};
      if (input.severity) filters.severity = input.severity;
      if (input.unread_only) filters.unreadOnly = true;
      filters.limit = input.limit || 20;
      return { alerts: database.getAlerts(filters) };
    }
    case "create_attestation_receipt": {
      const tx = database.getTransaction(input.tx_hash);
      if (!tx) return { error: "Transaction not found in database" };
      const result = await attestation.createOnChainReceipt({
        txHash: tx.tx_hash,
        from: tx.from_address,
        to: tx.to_address,
        amount: tx.amount,
        bridgeDirection: tx.bridge_direction,
      });
      if (result) {
        database.updateTransactionAttestation(tx.tx_hash, result.hash);
        return { success: true, attestationHash: result.hash, blockNumber: result.blockNumber };
      }
      return { success: false, error: "Attestation contract not configured or transaction failed" };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// POST /api/agent/chat
router.post("/chat", async (req, res) => {
  try {
    const c = getClient();
    if (!c) {
      return res.status(503).json({ error: "Claude API not configured. Set CLAUDE_API_KEY." });
    }

    const { message, history = [], conversationId } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const messages = [];
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });

    const toolActions = [];

    let response = await c.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Agentic loop: handle tool_use until we get a text response
    while (response.stop_reason === "tool_use") {
      const assistantContent = response.content;
      messages.push({ role: "assistant", content: assistantContent });

      const toolResults = [];
      for (const block of assistantContent) {
        if (block.type === "tool_use") {
          toolActions.push({ tool: block.name, input: block.input });
          const result = await executeTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      messages.push({ role: "user", content: toolResults });

      response = await c.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock ? textBlock.text : "I could not generate a response.";

    if (conversationId) {
      database.insertConversationMessage({
        conversationId,
        role: "user",
        content: message,
        toolCalls: null,
      });
      database.insertConversationMessage({
        conversationId,
        role: "assistant",
        content: reply,
        toolCalls: toolActions.length > 0 ? toolActions : null,
      });
    }

    res.json({ reply, toolActions, conversationId: conversationId || null });
  } catch (err) {
    console.error("Agent chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/conversations
router.get("/conversations", (req, res) => {
  try {
    const conversations = database.getRecentConversations(parseInt(req.query.limit) || 20);
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/conversations/:id
router.get("/conversations/:id", (req, res) => {
  try {
    const messages = database.getConversationMessages(req.params.id);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
