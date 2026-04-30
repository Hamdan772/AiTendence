const express = require("express");
const { getNotificationSettings, getCutoffPercent, setSetting } = require("../services/settings");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.redirect("/settings/notifications");
  });

  router.get("/notifications", async (req, res, next) => {
    try {
      const settings = await getNotificationSettings(db);
      const cutoffPercent = await getCutoffPercent(db);

      res.render("settings/notifications", {
        title: "Notifications",
        cutoffPercent,
        settings,
        message: req.query.message || ""
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/notifications", async (req, res, next) => {
    try {
      const cutoffRaw = Number(req.body.cutoff_percent);
      const cutoffPercent = Number.isFinite(cutoffRaw) ? Math.min(Math.max(cutoffRaw, 0), 100) : 75;

      await setSetting(db, "cutoff_percent", String(cutoffPercent));
      await setSetting(db, "notify_enabled", req.body.notify_enabled ? "1" : "0");
      await setSetting(db, "smtp_host", (req.body.smtp_host || "").trim());
      await setSetting(db, "smtp_port", (req.body.smtp_port || "587").trim());
      await setSetting(db, "smtp_user", (req.body.smtp_user || "").trim());
      await setSetting(db, "smtp_pass", (req.body.smtp_pass || "").trim());
      await setSetting(db, "smtp_from", (req.body.smtp_from || "").trim());

      res.redirect("/settings/notifications?message=Settings%20saved");
    } catch (err) {
      next(err);
    }
  });

  return router;
};
