-- Bridge transactions table
CREATE TABLE IF NOT EXISTS bridge_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    bridge_direction TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    attestation_tx_hash TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- AI analysis results table
CREATE TABLE IF NOT EXISTS ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_type TEXT NOT NULL,
    input_data TEXT NOT NULL,
    result TEXT NOT NULL,
    severity TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    related_tx_hash TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Subscriptions table (future feature)
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    notification_method TEXT NOT NULL,
    notification_target TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Agent conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tx_hash ON bridge_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_from_address ON bridge_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_to_address ON bridge_transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_timestamp ON bridge_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_status ON bridge_transactions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_id ON agent_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_created ON agent_conversations(created_at);
