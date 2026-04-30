const express = require("express");
const { normalizeDescriptor } = require("../services/face");

function buildStudentPayload(body) {
  return {
    student_id: (body.student_id || "").trim(),
    name: (body.name || "").trim(),
    email: (body.email || "").trim(),
    parent_email: (body.parent_email || "").trim(),
    phone: (body.phone || "").trim(),
    parent_phone: (body.parent_phone || "").trim()
  };
}

module.exports = (db) => {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const students = await db.all("SELECT * FROM students ORDER BY name");
      res.render("students/list", {
        title: "Students",
        students,
        message: req.query.message || ""
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/new", (req, res) => {
    res.render("students/form", {
      title: "Add Student",
      student: {
        student_id: "",
        name: "",
        email: "",
        parent_email: "",
        phone: "",
        parent_phone: ""
      },
      action: "/students",
      submitLabel: "Create Student",
      error: ""
    });
  });

  router.post("/", async (req, res) => {
    const payload = buildStudentPayload(req.body);

    if (!payload.student_id || !payload.name) {
      return res.render("students/form", {
        title: "Add Student",
        student: payload,
        action: "/students",
        submitLabel: "Create Student",
        error: "Student name and ID are required."
      });
    }

    try {
      await db.run(
        `INSERT INTO students
          (student_id, name, email, parent_email, phone, parent_phone, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        payload.student_id,
        payload.name,
        payload.email,
        payload.parent_email,
        payload.phone,
        payload.parent_phone,
        new Date().toISOString()
      );

      res.redirect("/students?message=Student%20created");
    } catch (err) {
      const errorMessage = err && err.code === "SQLITE_CONSTRAINT" ? "Student ID must be unique." : "Failed to create student.";
      res.render("students/form", {
        title: "Add Student",
        student: payload,
        action: "/students",
        submitLabel: "Create Student",
        error: errorMessage
      });
    }
  });

  router.get("/:id/edit", async (req, res, next) => {
    try {
      const student = await db.get("SELECT * FROM students WHERE id = ?", req.params.id);
      if (!student) {
        return res.redirect("/students?message=Student%20not%20found");
      }

      res.render("students/form", {
        title: "Edit Student",
        student,
        action: `/students/${student.id}`,
        submitLabel: "Save Changes",
        error: ""
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id", async (req, res) => {
    const payload = buildStudentPayload(req.body);

    if (!payload.student_id || !payload.name) {
      return res.render("students/form", {
        title: "Edit Student",
        student: { id: req.params.id, ...payload },
        action: `/students/${req.params.id}`,
        submitLabel: "Save Changes",
        error: "Student name and ID are required."
      });
    }

    try {
      await db.run(
        `UPDATE students
          SET student_id = ?, name = ?, email = ?, parent_email = ?, phone = ?, parent_phone = ?
          WHERE id = ?`,
        payload.student_id,
        payload.name,
        payload.email,
        payload.parent_email,
        payload.phone,
        payload.parent_phone,
        req.params.id
      );

      res.redirect("/students?message=Student%20updated");
    } catch (err) {
      const errorMessage = err && err.code === "SQLITE_CONSTRAINT" ? "Student ID must be unique." : "Failed to update student.";
      res.render("students/form", {
        title: "Edit Student",
        student: { id: req.params.id, ...payload },
        action: `/students/${req.params.id}`,
        submitLabel: "Save Changes",
        error: errorMessage
      });
    }
  });

  router.post("/:id/delete", async (req, res, next) => {
    try {
      await db.run("DELETE FROM students WHERE id = ?", req.params.id);
      res.redirect("/students?message=Student%20deleted");
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/face", async (req, res, next) => {
    try {
      const student = await db.get(
        "SELECT id, student_id, name, face_enrolled_at FROM students WHERE id = ?",
        req.params.id
      );

      if (!student) {
        return res.redirect("/students?message=Student%20not%20found");
      }

      return res.render("students/face", {
        title: `Face Enrollment - ${student.name}`,
        student,
        message: req.query.message || "",
        warning: req.query.warning || ""
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post("/:id/face", async (req, res, next) => {
    try {
      console.log('ENROLL: incoming request for student id=', req.params.id, 'descriptor type=', typeof req.body.descriptor);
      if (Array.isArray(req.body.descriptor)) {
        console.log('ENROLL: descriptor length=', req.body.descriptor.length);
      }
      const descriptor = normalizeDescriptor(req.body.descriptor);

      if (!descriptor) {
        console.log('ENROLL: invalid descriptor for student', req.params.id);
        return res.status(400).json({
          ok: false,
          message: "Invalid face data. Please capture your face again."
        });
      }

      const student = await db.get("SELECT id FROM students WHERE id = ?", req.params.id);
      if (!student) {
        console.log('ENROLL: student not found', req.params.id);
        return res.status(404).json({ ok: false, message: "Student not found." });
      }

      await db.run(
        "UPDATE students SET face_descriptor = ?, face_enrolled_at = ? WHERE id = ?",
        JSON.stringify(descriptor),
        new Date().toISOString(),
        req.params.id
      );

      console.log('ENROLL: updated student', req.params.id);

      return res.json({ ok: true, message: "Face enrolled successfully." });
    } catch (err) {
      console.error('ENROLL: error', err);
      return next(err);
    }
  });

  return router;
};
