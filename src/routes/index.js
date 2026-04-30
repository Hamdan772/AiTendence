const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const studentsRow = await db.get("SELECT COUNT(*) AS count FROM students");
      const enrolledRow = await db.get(
        "SELECT COUNT(*) AS count FROM students WHERE face_descriptor IS NOT NULL AND TRIM(face_descriptor) != ''"
      );
      const sessionsRow = await db.get("SELECT COUNT(*) AS count FROM attendance_sessions");
      const recordsRow = await db.get("SELECT COUNT(*) AS count FROM attendance_records");

      res.render("index", {
        title: "Dashboard",
        studentCount: studentsRow ? studentsRow.count : 0,
        enrolledCount: enrolledRow ? enrolledRow.count : 0,
        sessionCount: sessionsRow ? sessionsRow.count : 0,
        recordCount: recordsRow ? recordsRow.count : 0
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
