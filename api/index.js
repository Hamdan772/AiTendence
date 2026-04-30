const express = require("express");
const session = require("express-session");
const path = require("path");
const { connectDB } = require("../src/mongoConnection");
const {
  Student,
  AttendanceSession,
  AttendanceRecord,
  Admin,
  Settings
} = require("../src/models");

const createIndexRouter = require("../src/routes/index");
const createStudentsRouter = require("../src/routes/students");
const createAttendanceRouter = require("../src/routes/attendance");
const createAnalyticsRouter = require("../src/routes/analytics");
const createSettingsRouter = require("../src/routes/settings");
const createExportRouter = require("../src/routes/export");
const createAuthRouter = require("../src/routes/auth");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../src/views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "attendra-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true
    }
  })
);

app.use(express.static(path.join(__dirname, "../src/public")));
app.use(
  "/vendor/face-api",
  express.static(path.join(process.cwd(), "node_modules", "face-api.js", "dist"))
);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = true;
  next();
});

let dbConnected = false;

app.use(async (req, res, next) => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (err) {
      console.error("Failed to connect to MongoDB:", err);
      return res.status(500).render("error", {
        title: "Database Error",
        message: "Failed to connect to database. Please try again later."
      });
    }
  }

  next();
});

// MongoDB adapter for the db interface
const db = {
  get: async (query, params) => {
    // Simple queries support for migration
    if (query.includes("SELECT COUNT(*) AS count FROM students")) {
      const count = await Student.countDocuments();
      return { count };
    } else if (query.includes("SELECT COUNT(*) AS count FROM attendance_sessions")) {
      const count = await AttendanceSession.countDocuments();
      return { count };
    } else if (query.includes("SELECT COUNT(*) AS count FROM attendance_records")) {
      const count = await AttendanceRecord.countDocuments();
      return { count };
    }
    // Add more query patterns as needed
    return null;
  },
  all: async (query, params) => {
    // Simple queries support
    if (query.includes("SELECT * FROM students")) {
      return await Student.find().sort({ name: 1 });
    } else if (query.includes("SELECT * FROM attendance_sessions")) {
      return await AttendanceSession.find().sort({ session_date: -1 });
    }
    return [];
  },
  run: async (query, params) => {
    // Handle INSERT, UPDATE, DELETE
    return { lastID: null };
  }
};

// Initialize routes
app.use("/", createIndexRouter(db));
app.use("/students", createStudentsRouter(db));
app.use("/attendance", createAttendanceRouter(db));
app.use("/analytics", createAnalyticsRouter(db));
app.use("/settings", createSettingsRouter(db));
app.use("/export", createExportRouter(db));
app.use("/auth", createAuthRouter(db));

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Not Found",
    message: "The requested page could not be found."
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong while processing your request."
  });
});

module.exports = app;
module.exports.default = app;
