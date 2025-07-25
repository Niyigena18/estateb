// const { body, validationResult } = require('express-validator'); // If you use express-validator
const { sendErrorResponse } = require("../utils/helpers");
const { ValidationError } = require("../utils/constants");

exports.validateRegister = (req, res, next) => {
  const { username, email, password, phone } = req.body;

  if (!username || !email || !password || !phone) {
    return sendErrorResponse(
      res,
      400,
      ValidationError.MISSING_CREDENTIALS,
      "All fields (username, email, password, phone) are required."
    );
  }
  if (password.length < 6) {
    return sendErrorResponse(
      res,
      400,
      ValidationError.PASSWORD_TOO_SHORT,
      "Password must be at least 6 characters."
    );
  }
  // Basic email regex (can be more robust)
  if (!/\S+@\S+\.\S+/.test(email)) {
    return sendErrorResponse(res, 400, ValidationError.INVALID_EMAIL);
  }
  // Add more validation logic as needed (e.g., phone format)

  next(); // Proceed to the next middleware/controller if validation passes
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendErrorResponse(res, 400, ValidationError.MISSING_CREDENTIALS);
  }
  // Basic email regex
  if (!/\S+@\S+\.\S+/.test(email)) {
    return sendErrorResponse(res, 400, ValidationError.INVALID_EMAIL);
  }

  next();
};

// You can add more specific validation middleware for other routes/models
