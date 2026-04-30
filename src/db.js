const { initDb: initJsonDb } = require("./db-json");

async function initDb() {
  // Use JSON file-based database (works on Vercel without external services)
  return await initJsonDb();
}

module.exports = { initDb };
