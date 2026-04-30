const express = require("express");
const { maybeSendAlert } = require("../services/notifications");
const { findBestFaceMatch, normalizeDescriptor } = require("../services/face");

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureSessionWithDefaultAbsences(db, sessionDate) {
  let session = await db.get(
    "SELECT id FROM attendance_sessions WHERE session_date = ?",
    sessionDate
  );

  if (!session) {
    const createdAt = new Date().toISOString();
    const result = await db.run(
      "INSERT INTO attendance_sessions (session_date, created_at) VALUES (?, ?)",
      sessionDate,
      createdAt
    );
    session = { id: result.lastID };

    await db.run(
      `INSERT INTO attendance_records (session_id, student_id, status, recorded_at)
       SELECT ?, s.id, 'absent', ?
       FROM students s
       ON CONFLICT(session_id, student_id) DO NOTHING`,
      session.id,
      createdAt
    );
  }

  return session;
}

module.exports = (db) => {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const records = await db.all(`
        SELECT
          ar.status,
          ar.recorded_at,
          s.name,
          s.student_id AS student_code,
          sess.session_date
        FROM attendance_records ar
        JOIN students s ON s.id = ar.student_id
        JOIN attendance_sessions sess ON sess.id = ar.session_id
        ORDER BY sess.session_date DESC, s.name ASC
        LIMIT 200
      `);

      res.render("attendance/list", {
        title: "Attendance Records",
        records,
        success: req.query.success === "1"
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/manual", async (req, res, next) => {
    try {
      const students = await db.all("SELECT id, name, student_id FROM students ORDER BY name");
      res.render("attendance/manual", {
        title: "Manual Attendance",
        students,
        today: getToday(),
        success: req.query.success === "1",
        message: ""
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/manual", async (req, res, next) => {
    const studentId = Number(req.body.studentId);
    const sessionDate = (req.body.sessionDate || "").trim() || getToday();
    const status = (req.body.status || "present").trim();

    if (!studentId || !sessionDate || !["present", "absent"].includes(status)) {
      try {
        const students = await db.all("SELECT id, name, student_id FROM students ORDER BY name");
        return res.render("attendance/manual", {
          title: "Manual Attendance",
          students,
          today: sessionDate,
          success: false,
          message: "Please select a student, date, and status."
        });
      } catch (err) {
        return next(err);
      }
    }

    try {
      let session = await db.get(
        "SELECT id FROM attendance_sessions WHERE session_date = ?",
        sessionDate
      );

      if (!session) {
        const result = await db.run(
          "INSERT INTO attendance_sessions (session_date, created_at) VALUES (?, ?)",
          sessionDate,
          new Date().toISOString()
        );
        session = { id: result.lastID };
      }

      await db.run(
        `INSERT INTO attendance_records (session_id, student_id, status, recorded_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(session_id, student_id) DO UPDATE SET
           status = excluded.status,
           recorded_at = excluded.recorded_at`,
        session.id,
        studentId,
        status,
        new Date().toISOString()
      );

      await maybeSendAlert(db, studentId, session.id);

      res.redirect("/attendance?success=1");
    } catch (err) {
      next(err);
    }
  });

  router.get("/face", async (req, res, next) => {
    try {
      const students = await db.all(
        `SELECT id, name, student_id, face_descriptor
         FROM students
         ORDER BY name`
      );

      const enrolledCount = students.filter((student) => Boolean(student.face_descriptor)).length;

      res.render("attendance/face", {
        title: "Face Attendance",
        today: getToday(),
        studentCount: students.length,
        enrolledCount,
        message: req.query.message || "",
        warning: req.query.warning || ""
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/face/scan", async (req, res, next) => {
    try {
      const sessionDate = (req.body.sessionDate || "").trim() || getToday();
      const descriptor = normalizeDescriptor(req.body.descriptor);

      if (!descriptor) {
        return res.status(400).json({
          ok: false,
          message: "Invalid face data. Please face the camera and try again."
        });
      }

      const studentsWithFaces = await db.all(
        `SELECT id, name, student_id, face_descriptor
         FROM students
         WHERE face_descriptor IS NOT NULL AND TRIM(face_descriptor) != ''`
      );

      if (studentsWithFaces.length === 0) {
        return res.status(400).json({
          ok: false,
          message: "No enrolled faces found. Enroll student faces first."
        });
      }

      const match = findBestFaceMatch(studentsWithFaces, descriptor);
      if (!match) {
        return res.status(404).json({
          ok: false,
          message: "No matching student found."
        });
      }

      const session = await ensureSessionWithDefaultAbsences(db, sessionDate);
      const recordedAt = new Date().toISOString();

      await db.run(
        `INSERT INTO attendance_records (session_id, student_id, status, recorded_at)
         VALUES (?, ?, 'present', ?)
         ON CONFLICT(session_id, student_id) DO UPDATE SET
           status = 'present',
           recorded_at = excluded.recorded_at`,
        session.id,
        match.student.id,
        recordedAt
      );

      await maybeSendAlert(db, match.student.id, session.id);

      return res.json({
        ok: true,
        student: {
          id: match.student.id,
          name: match.student.name,
          student_id: match.student.student_id
        },
        distance: Number(match.distance.toFixed(4)),
        sessionDate
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
