// routes/rentRequests.js
const express = require("express");
const router = express.Router();
const rentRequestController = require("../controllers/rentRequestController"); // Import the rent request controller
const auth = require("../middleware/auth"); // Import the authentication middleware
const authorizeRole = require("../middleware/authorizeRole"); // Import the authorization middleware
const { ROLE } = require("../utils/constants"); // Import roles for authorizeRole

// @route   POST /api/rent-requests
// @desc    Create a new rent request for a house
// @access  Private (Tenant only)
// Requires authentication and tenant role
router.post(
  "/",
  auth,
  authorizeRole([ROLE.TENANT]),
  rentRequestController.createRentRequest
);

// @route   GET /api/rent-requests
// @desc    Get all rent requests (Landlord sees all for their houses, Tenant sees their own)
// @access  Private (Tenant or Landlord)
// Requires authentication (role check handled inside controller)
router.get(
  "/",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentRequestController.getRentRequests
);

// @route   GET /api/rent-requests/:id
// @desc    Get a single rent request by ID (Tenant or Landlord)
// @access  Private (Tenant or Landlord)
// Requires authentication (role check handled inside controller for ownership)
router.get(
  "/:id",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentRequestController.getRentRequestById
);

// @route   PUT /api/rent-requests/:id/status
// @desc    Update the status of a rent request (Landlord: approve/reject/cancel for their house; Tenant: cancel their own)
// @access  Private (Tenant or Landlord)
// Requires authentication (role and ownership check handled inside controller)
router.put(
  "/:id/status",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentRequestController.updateRentRequestStatus
);

// @route   DELETE /api/rent-requests/:id
// @desc    Delete a rent request (Tenant who made it, or Landlord of the house)
// @access  Private (Tenant or Landlord)
// Requires authentication (role and ownership check handled inside controller)
router.delete(
  "/:id",
  auth,
  authorizeRole([ROLE.TENANT, ROLE.LANDLORD]),
  rentRequestController.deleteRentRequest
);

module.exports = router;
