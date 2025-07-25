// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validation"); // Assuming you have these
const auth = require("../middleware/auth"); // Authentication middleware

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", validateRegister, authController.register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", validateLogin, authController.login);

// @route   GET /api/auth/me
// @desc    Get authenticated user profile
// @access  Private
router.get("/me", auth, authController.getMe);

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset link to be sent to email
// @access  Public
router.post("/forgot-password", authController.forgotPassword);

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset user password using the token
// @access  Public
router.put("/reset-password/:token", authController.resetPassword);

module.exports = router;
