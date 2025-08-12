// const { verifyToken } = require("../config/jwt");

// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "Access token required" });
//   }

//   try {
//     const user = verifyToken(token);
//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(403).json({ message: "Invalid token" });
//   }
// };

// const isLandlord = (req, res, next) => {
//   if (req.user.role !== "landlord") {
//     return res.status(403).json({ message: "Landlord access required" });
//   }
//   next();
// };

// const isTenant = (req, res, next) => {
//   if (req.user.role !== "tenant") {
//     return res.status(403).json({ message: "Tenant access required" });
//   }
//   next();
// };

// module.exports = { authenticateToken, isLandlord, isTenant };
const { verifyToken } = require("../config/jwt");
const { sendErrorResponse } = require("../utils/helpers");
const { AuthenticationError } = require("../utils/constants");

const auth = (req, res, next) => {
  // Get token from header
  const token = req.header("Authorization");

  // Check if not token
  if (!token) {
    return sendErrorResponse(res, 401, AuthenticationError.TOKEN_MISSING);
  }

  try {
    // Verify token
    const decoded = verifyToken(token); // This will throw if token is invalid/expired

    // Attach user to request object
    req.user = decoded.user; // Assuming your JWT payload has a 'user' object
    next();
  } catch (err) {
    // Token is not valid
    console.error("Auth middleware token error:", err.message);
    return sendErrorResponse(res, 401, AuthenticationError.TOKEN_INVALID);
  }
};

module.exports = auth;
