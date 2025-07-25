// const jwt = require("jsonwebtoken");

// const generateToken = (payload) => {
//   return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
// };

// const verifyToken = (token) => {
//   return jwt.verify(token, process.env.JWT_SECRET);
// };

// module.exports = { generateToken, verifyToken };
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Load environment variables

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1h"; // Default to 1 hour if not set

const generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = {
  jwtSecret,
  jwtExpiresIn,
  generateToken,
  verifyToken,
};
