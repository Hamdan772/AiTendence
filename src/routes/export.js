const express = require("express");
const { toCsv } = require("../services/csv");

module.exports = (db) => {
  const router = express.Router();

  router.get("/attendance.csv", async (req, res, next) => {
    try {
      const rows = await db.all(`
        SELECT
          sess.session_date AS session_date,
          s.student_id AS student_id,
          s.name AS student_name,
          ar.status AS status,
          ar.recorded_at AS recorded_at
        FROM attendance_records ar
        JOIN attendance_sessions sess ON sess.id = ar.session_id
        JOIN students s ON s.id = ar.student_id
        ORDER BY sess.session_date DESC, s.name ASC
      `);

      const csv = toCsv(rows, [
        { key: "session_date", label: "Session Date" },
        { key: "student_id", label: "Student ID" },
        { key: "student_name", label: "Student Name" },
        { key: "status", label: "Status" },
        { key: "recorded_at", label: "Recorded At" }
      ]);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=attendance.csv");
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
