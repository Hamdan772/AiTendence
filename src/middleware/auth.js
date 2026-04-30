const { getAdminPasswordHash } = require("../services/settings");

function createAuthMiddleware(db) {
  return async (req, res, next) => {
    res.locals.isAuthenticated = Boolean(req.session && req.session.isAuthenticated);

    if (req.path.startsWith("/styles") || req.path.startsWith("/public")) {
      return next();
    }

    const passwordHash = await getAdminPasswordHash(db);
    const setupComplete = Boolean(passwordHash);
    const isLoginRoute = req.path.startsWith("/login");
    const isSetupRoute = req.path.startsWith("/setup");

    if (!setupComplete && !isSetupRoute) {
      return res.redirect("/setup");
    }

    if (setupComplete && isSetupRoute) {
      return res.redirect("/login");
    }

    if (res.locals.isAuthenticated) {
      return next();
    }

    if (isLoginRoute || isSetupRoute) {
      return next();
    }

    return res.redirect("/login");
  };
}

module.exports = { createAuthMiddleware };
