const fs = require("fs");
const path = require("path");
const database = require("../services/database");

function setup() {
  console.log("BridgeWatch Setup\n");

  // Create data directory
  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("Created data/ directory");
  }

  // Create .env if it doesn't exist
  const envPath = path.join(__dirname, "../.env");
  const envExamplePath = path.join(__dirname, "../.env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example (update with your keys)");
  }

  // Initialize database
  database.init();
  console.log("Database initialized");

  console.log("\nSetup complete! Next steps:");
  console.log("  1. Update .env with your API keys");
  console.log("  2. Run: npm run seed (to populate test data)");
  console.log("  3. Run: npm run dev (to start the API server)");
  console.log("  4. Run: npm run listener (to start the event listener)");
}

setup();
