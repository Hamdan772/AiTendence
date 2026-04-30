const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const studentsRow = await db.get("SELECT COUNT(*) AS count FROM students");
      const sessionsRow = await db.get("SELECT COUNT(*) AS count FROM attendance_sessions");
      const recordsRow = await db.get("SELECT COUNT(*) AS count FROM attendance_records");

      res.render("index", {
        title: "Dashboard",
        studentCount: studentsRow ? studentsRow.count : 0,
        sessionCount: sessionsRow ? sessionsRow.count : 0,
        recordCount: recordsRow ? recordsRow.count : 0
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
