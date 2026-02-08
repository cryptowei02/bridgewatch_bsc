# BridgeWatch

**AI-powered real-time monitoring system for opBNB Bridge**

BridgeWatch monitors cross-chain bridge transactions between BSC and opBNB in real-time, creates verifiable on-chain attestation receipts, and uses Claude AI to detect anomalies, predict delays, and recommend optimal bridge timing.

Built for the **Good Vibes Only: OpenClaw Edition** hackathon on BNB Chain.

## Features

### Real-Time Bridge Monitoring
- WebSocket connection to opBNB mainnet for live event streaming
- Monitors `DepositFinalized` and `WithdrawalInitiated` events on the OP Stack L2StandardBridge
- Auto-reconnection with configurable retry logic

### On-Chain Attestation Receipts
- Solidity smart contract (`BridgeAttestation.sol`) deployed on **BSC mainnet**
- Creates immutable, verifiable receipts for every bridge transaction
- Contract address: [`0x026697eE1a5bc1B4F9e25bfDDF27030996843cEF`](https://bscscan.com/address/0x026697eE1a5bc1B4F9e25bfDDF27030996843cEF)

### AI-Powered Analysis (Claude API)
- **Anomaly Detection** - Identifies unusual patterns in bridge activity (large transfers, rapid sequences, suspicious addresses)
- **Delay Prediction** - Estimates bridge confirmation times based on recent transaction data
- **Optimal Timing** - Recommends the best time windows for bridging to minimize fees and delays
- Results cached for 5 minutes to reduce API costs and stabilize outputs

### Dashboard Frontend
- Real-time transaction list with live polling
- Analytics charts (volume over time, status distribution)
- AI Insights page with anomaly reports, delay predictions, and timing suggestions
- Receipt lookup by transaction hash
- Network health status indicator

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity, OpenZeppelin, Hardhat |
| Backend | Node.js, Express, ethers.js v6 |
| Database | SQLite (better-sqlite3) |
| AI | Anthropic Claude API (@anthropic-ai/sdk) |
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Recharts |
| Networks | BSC Mainnet, opBNB Mainnet |

## Architecture

```
opBNB Bridge (L2StandardBridge)
        |
        | WebSocket events
        v
  Event Listener ──> SQLite Database ──> Express API ──> Next.js Frontend
        |                                    |
        v                                    v
  Attestation Contract (BSC)          Claude AI Analysis
```

## Project Structure

```
bridgewatch/
├── contracts/
│   ├── BridgeAttestation.sol        # On-chain attestation contract
│   ├── scripts/deploy.js            # Hardhat deploy script
│   └── test/BridgeAttestation.test.js
├── services/
│   ├── eventListener.js             # Real-time bridge event monitor
│   ├── attestation.js               # On-chain receipt creation
│   ├── aiAnalysis.js                # Claude AI integration
│   └── database.js                  # SQLite database layer
├── server/
│   ├── index.js                     # Express API server
│   └── routes/
│       ├── transactions.js          # GET /api/transactions
│       ├── receipts.js              # GET /api/receipt/:txHash
│       ├── alerts.js                # GET /api/alerts
│       └── analytics.js             # GET /api/analytics/*
├── frontend/                        # Next.js app
│   ├── app/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── analytics/page.tsx       # Charts & volume data
│   │   ├── insights/page.tsx        # AI insights
│   │   └── receipt/[txHash]/page.tsx
│   ├── components/                  # StatsCards, TransactionList, etc.
│   └── lib/                         # API client, utilities
├── scripts/
│   ├── fetchHistory.js              # Pull historical data from chain
│   ├── seed.js                      # Seed test data
│   └── setup.js                     # First-run setup
├── database/
│   └── schema.sql                   # SQLite schema
├── hardhat.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- A [NodeReal](https://nodereal.io/) API key (for opBNB WebSocket RPC)
- An [Anthropic](https://console.anthropic.com/) API key (for Claude AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/cryptowei02/bridgewatch_bsc.git
cd bridgewatch_bsc

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Copy environment config
cp .env.example .env
```

### Configuration

Edit `.env` with your keys:

```env
# Required: opBNB WebSocket RPC (get from NodeReal)
OPBNB_RPC_URL=wss://opbnb-mainnet.nodereal.io/ws/v1/YOUR_API_KEY

# Required: Claude API key (for AI features)
CLAUDE_API_KEY=sk-ant-api03-YOUR_KEY_HERE

# Optional: Private key for on-chain attestation
ATTESTATION_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

### Running

You need to run **3 services**:

```bash
# Terminal 1: Backend API server (port 3001)
npm start

# Terminal 2: Real-time event listener
npm run listener

# Terminal 3: Frontend (port 3000)
cd frontend && npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Load Historical Data

To populate the database with real historical bridge transactions:

```bash
node scripts/fetchHistory.js
```

This scans the last ~200,000 blocks on opBNB mainnet for bridge events.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (supports pagination & filters) |
| GET | `/api/transactions/:txHash` | Get single transaction |
| GET | `/api/receipt/:txHash` | Get transaction with attestation receipt |
| GET | `/api/alerts` | List AI-generated alerts |
| GET | `/api/analytics/stats` | Aggregate statistics |
| GET | `/api/analytics/volume` | Volume over time (24h/7d/30d) |
| GET | `/api/analytics/insights` | AI insights (cached 5min) |
| GET | `/api/health` | Health check |

## Smart Contract

The `BridgeAttestation` contract provides:

- **createReceipt()** - Store a bridge transaction receipt on-chain
- **verifyReceipt()** - Mark a receipt as verified
- **getReceipt()** - Read a receipt by transaction hash
- **getRecentReceipts()** - Get the N most recent receipts
- **getTotalReceipts()** - Total receipt count

### Compile & Test

```bash
npx hardhat compile
npx hardhat test
```

### Deploy

```bash
# BSC Mainnet
npx hardhat run contracts/scripts/deploy.js --network bsc

# opBNB Mainnet
npx hardhat run contracts/scripts/deploy.js --network opbnb
```

## License

MIT
