const express = require("express");
const bcrypt = require("bcryptjs");
const { getAdminPasswordHash, setAdminPasswordHash } = require("../services/settings");

module.exports = (db) => {
  const router = express.Router();

  router.get("/login", async (req, res, next) => {
    try {
      const hash = await getAdminPasswordHash(db);
      if (!hash) {
        return res.redirect("/setup");
      }

      res.render("auth/login", {
        title: "Admin Login",
        error: ""
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/login", async (req, res, next) => {
    const password = (req.body.password || "").trim();

    try {
      const hash = await getAdminPasswordHash(db);
      if (!hash) {
        return res.redirect("/setup");
      }

      const valid = await bcrypt.compare(password, hash);
      if (!valid) {
        return res.render("auth/login", {
          title: "Admin Login",
          error: "Incorrect password."
        });
      }

      req.session.isAuthenticated = true;
      res.redirect("/");
    } catch (err) {
      next(err);
    }
  });

  router.get("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });

  router.get("/setup", async (req, res, next) => {
    try {
      const hash = await getAdminPasswordHash(db);
      if (hash) {
        return res.redirect("/login");
      }

      res.render("auth/setup", {
        title: "Set Admin Password",
        error: ""
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/setup", async (req, res, next) => {
    const password = (req.body.password || "").trim();
    const confirm = (req.body.confirm || "").trim();

    if (password.length < 8) {
      return res.render("auth/setup", {
        title: "Set Admin Password",
        error: "Password must be at least 8 characters."
      });
    }

    if (password !== confirm) {
      return res.render("auth/setup", {
        title: "Set Admin Password",
        error: "Passwords do not match."
      });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      await setAdminPasswordHash(db, hash);
      req.session.isAuthenticated = true;
      res.redirect("/");
    } catch (err) {
      next(err);
    }
  });

  return router;
};
