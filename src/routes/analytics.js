const express = require("express");
const { getAnalytics } = require("../services/analytics");
const { getCutoffPercent } = require("../services/settings");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const cutoffPercent = await getCutoffPercent(db);
      const analytics = await getAnalytics(db, cutoffPercent);

      res.render("analytics/dashboard", {
        title: "Analytics",
        cutoffPercent,
        ...analytics
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
