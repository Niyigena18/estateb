const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For JWT token generation
const crypto = require("crypto"); // For generating secure tokens
const User = require("../models/user"); // User model
const { jwtSecret, jwtExpiresIn, generateToken } = require("../config/jwt"); // JWT configuration
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers"); // Helper for consistent responses
const {
  ValidationError,
  AuthenticationError,
  ServerError,
} = require("../utils/constants"); // Custom error types/constants
const { sendPasswordResetEmail } = require("../services/emailService"); // Our new email service

const register = async (req, res) => {
  try {
    const { username, email, password, phone, role } = req.body;

    // 1. Basic Validation (as in validation.js)
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
    if (!/\S+@\S+\.\S+/.test(email)) {
      return sendErrorResponse(res, 400, ValidationError.INVALID_EMAIL);
    }

    // 2. Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return sendErrorResponse(
        res,
        409,
        AuthenticationError.USER_ALREADY_EXISTS
      );
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user in database
    const userId = await User.create({
      username,
      email,
      password: hashedPassword,
      phone,
      role,
    });

    // 5. Generate JWT token (using generateToken from config/jwt)
    const payload = {
      user: {
        id: userId, // The ID of the newly created user
        email: email,
        role: role, // Assuming role is provided or defaults
      },
    };
    const token = generateToken(payload);

    sendSuccessResponse(res, 201, "User registered successfully", {
      userId,
      token,
      user: { id: userId, username, email, role }, // Return basic user info
    });
  } catch (error) {
    // --- THESE LOGGING LINES ARE CRUCIAL FOR DEBUGGING ---
    console.error("SERVER ERROR DURING REGISTRATION:");
    console.error(error); // Log the full error object for detailed insights
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    // --- END DEBUGGING LOGS ---

    sendErrorResponse(
      res,
      500,
      "Server error during registration",
      error.message // Pass error.message to client, even if it's empty
    );
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validate input
    if (!email || !password) {
      return sendErrorResponse(res, 400, ValidationError.MISSING_CREDENTIALS);
    }

    // 2. Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return sendErrorResponse(
        res,
        400,
        AuthenticationError.INVALID_CREDENTIALS
      );
    }

    // 3. Compare provided password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendErrorResponse(
        res,
        400,
        AuthenticationError.INVALID_CREDENTIALS
      );
    }

    // 4. Generate JWT token
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
    const token = generateToken(payload);

    sendSuccessResponse(res, 200, "Logged in successfully", {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    sendErrorResponse(res, 500, "Server error during login", error.message);
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return sendErrorResponse(res, 404, AuthenticationError.USER_NOT_FOUND);
    }

    sendSuccessResponse(res, 200, "User profile retrieved", { user });
  } catch (error) {
    console.error("Get user profile error:", error.message);
    sendErrorResponse(
      res,
      500,
      "Server error retrieving user profile",
      error.message
    );
  }
};

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset link to be sent to email
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendErrorResponse(res, 400, ValidationError.MISSING_EMAIL);
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return sendErrorResponse(res, 400, ValidationError.INVALID_EMAIL);
    }

    const user = await User.findByEmail(email);

    // Important: Send a generic success message even if the user is not found
    // This prevents email enumeration attacks.
    if (!user) {
      return sendSuccessResponse(
        res,
        200,
        "If an account with that email exists, a password reset email has been sent."
      );
    }

    // Generate a secure, unique token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set token expiration (e.g., 1 hour from now)
    const expires = Date.now() + 3600000; // 1 hour in milliseconds

    // Store the token and expiry in the database
    // We store the raw token in the DB to match the one sent in the email.
    // A more secure approach would be to hash the token before storing,
    // and then hash the incoming token for comparison. For simplicity,
    // we'll store the raw for now, but be aware of the security trade-off.
    const updated = await User.updateResetToken(user.id, resetToken, expires);

    if (!updated) {
      throw new Error("Failed to update user with reset token.");
    }

    // Send the email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken);

    if (!emailSent) {
      // If email sending fails, you might want to log this but still
      // tell the user it was sent to avoid giving away info.
      // Or, clean up the token if sending is critical. For now, just log.
      console.warn(`Could not send password reset email to ${user.email}`);
    }

    sendSuccessResponse(
      res,
      200,
      "If an account with that email exists, a password reset email has been sent."
    );
  } catch (error) {
    console.error("Forgot password error:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset user password using the token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.PASSWORD_TOO_SHORT,
        "New password must be at least 6 characters."
      );
    }

    const user = await User.findByResetToken(token);

    if (!user) {
      return sendErrorResponse(
        res,
        400,
        AuthenticationError.INVALID_TOKEN,
        "Password reset token is invalid or has expired."
      );
    }

    // Check if the token has expired
    if (user.password_reset_expires < Date.now()) {
      // Clear expired token from DB for security and usability
      await User.updateResetToken(user.id, null, null); // Clear token
      return sendErrorResponse(
        res,
        400,
        AuthenticationError.TOKEN_EXPIRED,
        "Password reset token has expired."
      );
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear the reset token fields
    const updated = await User.updatePassword(user.id, hashedNewPassword);

    if (!updated) {
      throw new Error("Failed to update password.");
    }

    sendSuccessResponse(res, 200, "Password has been successfully reset.");
  } catch (error) {
    console.error("Reset password error:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword, // Export the new function
  resetPassword, // Export the new function
};
