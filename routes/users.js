const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/authorizeRole");
const { ROLE } = require("../utils/constants");

// @route   GET /api/users/role/:roleName
// @desc    Get all users by role
// @access  Private (Admin only)
router.get(
  "/role/:roleName",
  auth,
  authorizeRole([ROLE.ADMIN]),
  userController.getUsersByRole
);
router.put(
  "/:id/deactivate",
  auth,
  authorizeRole([ROLE.LANDLORD, ROLE.ADMIN]),
  userController.deactivateTenant
);
// @route   GET /api/users/:id
// @desc    Get a single user by ID
// @access  Private (User themselves or Admin)
router.get("/:id", auth, userController.getUserById);

module.exports = router;
