const express = require("express");
const session = require("express-session");
const path = require("path");
const { initDb } = require("./db");

const createIndexRouter = require("./routes/index");
const createStudentsRouter = require("./routes/students");
const createAttendanceRouter = require("./routes/attendance");
const createAnalyticsRouter = require("./routes/analytics");
const createSettingsRouter = require("./routes/settings");
const createExportRouter = require("./routes/export");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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
app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/vendor/face-api",
  express.static(path.join(process.cwd(), "node_modules", "face-api.js", "dist"))
);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = true;
  next();
});

async function start() {
  const db = await initDb();

  app.use("/", createIndexRouter(db));
  app.use("/students", createStudentsRouter(db));
  app.use("/attendance", createAttendanceRouter(db));
  app.use("/analytics", createAnalyticsRouter(db));
  app.use("/settings", createSettingsRouter(db));
  app.use("/export", createExportRouter(db));

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

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
