async function getSetting(db, key, defaultValue) {
  const row = await db.get("SELECT value FROM settings WHERE key = ?", key);
  if (!row) {
    return defaultValue;
  }
  return row.value;
}

async function setSetting(db, key, value) {
  await db.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value
  );
}

async function getCutoffPercent(db) {
  const raw = await getSetting(db, "cutoff_percent", "75");
  const value = Number(raw);
  return Number.isFinite(value) ? value : 75;
}

async function getNotificationSettings(db) {
  const enabled = (await getSetting(db, "notify_enabled", "0")) === "1";
  const host = await getSetting(db, "smtp_host", "");
  const portRaw = await getSetting(db, "smtp_port", "587");
  const port = Number(portRaw) || 587;
  const user = await getSetting(db, "smtp_user", "");
  const pass = await getSetting(db, "smtp_pass", "");
  const from = await getSetting(db, "smtp_from", "");

  return {
    enabled,
    host,
    port,
    user,
    pass,
    from
  };
}

async function getAdminPasswordHash(db) {
  return getSetting(db, "admin_password_hash", "");
}

async function setAdminPasswordHash(db, hash) {
  await setSetting(db, "admin_password_hash", hash || "");
}

module.exports = {
  getSetting,
  setSetting,
  getCutoffPercent,
  getNotificationSettings,
  getAdminPasswordHash,
  setAdminPasswordHash
};
