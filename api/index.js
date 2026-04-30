const express = require("express");
const session = require("express-session");
const path = require("path");
const { initDb } = require("../src/db");

const createIndexRouter = require("../src/routes/index");
const createStudentsRouter = require("../src/routes/students");
const createAttendanceRouter = require("../src/routes/attendance");
const createAnalyticsRouter = require("../src/routes/analytics");
const createSettingsRouter = require("../src/routes/settings");
const createExportRouter = require("../src/routes/export");
const createAuthRouter = require("../src/routes/auth");

const app = express();
const dbPromise = initDb();

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

const db = {
  async get(sql, ...params) {
    const database = await dbPromise;
    return database.get(sql, ...params);
  },
  async all(sql, ...params) {
    const database = await dbPromise;
    return database.all(sql, ...params);
  },
  async run(sql, ...params) {
    const database = await dbPromise;
    return database.run(sql, ...params);
  },
  async exec(sql) {
    const database = await dbPromise;
    return database.exec(sql);
  }
};

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
