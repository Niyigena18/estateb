// middleware/authorizeRole.js
const { sendErrorResponse } = require("../utils/helpers");
const { AuthenticationError } = require("../utils/constants");

/**
 * Middleware to authorize access based on user roles.
 * @param {string[]} allowedRoles - An array of roles that are allowed to access the route (e.g., ['landlord', 'admin']).
 */
const authorizeRole = (allowedRoles) => (req, res, next) => {
  // req.user is set by the 'auth' middleware, which extracts user info from the JWT
  if (!req.user || !req.user.role) {
    // This should ideally be caught by the 'auth' middleware first,
    // but acts as a safeguard.
    return sendErrorResponse(
      res,
      401,
      AuthenticationError.UNAUTHORIZED,
      "Authentication required to access this resource."
    );
  }

  const { role } = req.user;

  if (allowedRoles.includes(role)) {
    // User's role is in the allowed roles list, proceed to the next middleware/route handler
    next();
  } else {
    // User's role is not allowed
    return sendErrorResponse(
      res,
      403,
      AuthenticationError.FORBIDDEN,
      `Access forbidden. You do not have the required role (${allowedRoles.join(
        " or "
      )}).`
    );
  }
};

module.exports = authorizeRole;
