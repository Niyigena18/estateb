// routes/rentPayments.js
const express = require("express");
const router = express.Router();
const rentPaymentController = require("../controllers/rentPaymentController"); // Import the rent payment controller
const auth = require("../middleware/auth"); // Import the authentication middleware
const authorizeRole = require("../middleware/authorizeRole"); // Import the authorization middleware
const { ROLE } = require("../utils/constants"); // Import roles for authorizeRole

// @route   POST /api/rent-payments
// @desc    Create a new rent payment record
// @access  Private (Landlord only)
// Requires authentication and landlord role
router.post(
  "/",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  rentPaymentController.createRentPayment
);

// @route   GET /api/rent-payments
// @desc    Get all rent payment records (Landlord sees all for their houses, Tenant sees their own)
// @access  Private (Tenant or Landlord)
// Requires authentication (role check handled inside controller)
router.get(
  "/",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentPaymentController.getRentPayments
);

// @route   GET /api/rent-payments/:id
// @desc    Get a single rent payment record by ID (Owner Tenant or Landlord of house)
// @access  Private (Tenant or Landlord)
// Requires authentication (role check handled inside controller for ownership)
router.get(
  "/:id",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentPaymentController.getRentPaymentById
);

// @route   PUT /api/rent-payments/:id
// @desc    Update a rent payment record
// @access  Private (Landlord only, for payments related to their houses)
// Requires authentication and landlord role
router.put(
  "/:id",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  rentPaymentController.updateRentPayment
);

// @route   DELETE /api/rent-payments/:id
// @desc    Delete a rent payment record
// @access  Private (Landlord only, for payments related to their houses)
// Requires authentication and landlord role
router.delete(
  "/:id",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  rentPaymentController.deleteRentPayment
);

module.exports = router;
