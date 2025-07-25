// routes/rentReminders.js
const express = require("express");
const router = express.Router();
const rentReminderController = require("../controllers/rentReminderController"); // Import the rent reminder controller
const auth = require("../middleware/auth"); // Import the authentication middleware
const authorizeRole = require("../middleware/authorizeRole"); // Import the authorization middleware
const { ROLE } = require("../utils/constants"); // Import roles for authorizeRole

// @route   POST /api/rent-reminders
// @desc    Create a new rent reminder
// @access  Private (Landlord only)
// Requires authentication and landlord role
router.post(
  "/",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  rentReminderController.createRentReminder
);

// @route   GET /api/rent-reminders
// @desc    Get all rent reminders (Landlord sees all they created, Tenant sees their own)
// @access  Private (Tenant or Landlord)
// Requires authentication (role check handled inside controller)
router.get(
  "/",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentReminderController.getRentReminders
);

// @route   GET /api/rent-reminders/:id
// @desc    Get a single rent reminder by ID (Owner Tenant or Landlord who created it)
// @access  Private (Tenant or Landlord)
// Requires authentication (role check handled inside controller for ownership)
router.get(
  "/:id",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentReminderController.getRentReminderById
);

// @route   PUT /api/rent-reminders/:id
// @desc    Update a rent reminder
// @access  Private (Landlord only, for reminders they created)
// Requires authentication and landlord role
router.put(
  "/:id",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  rentReminderController.updateRentReminder
);

// @route   PUT /api/rent-reminders/:id/mark-sent
// @desc    Mark a rent reminder as sent
// @access  Private (Landlord only, for reminders they created)
// Requires authentication and landlord role
router.put(
  "/:id/mark-sent",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  rentReminderController.markRentReminderAsSent
);

// @route   DELETE /api/rent-reminders/:id
// @desc    Delete a rent reminder
// @access  Private (Landlord only, for reminders they created)
// Requires authentication and landlord role
router.delete(
  "/:id",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  rentReminderController.deleteRentReminder
);

module.exports = router;
