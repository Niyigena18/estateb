const express = require("express");
const router = express.Router();
const leaseAgreementController = require("../controllers/leaseAgreementController");
const auth = require("../middleware/auth"); // Assuming your authentication middleware

// All lease agreement routes will be protected by the 'auth' middleware
// meaning a valid JWT token is required to access them.

// @route   POST /api/leases
// @desc    Create a new lease agreement
// @access  Private (Landlord, Admin)
router.post("/", auth, leaseAgreementController.createLease);

// @route   GET /api/leases
// @desc    Get all lease agreements (filtered by user role)
// @access  Private (Landlord, Tenant, Admin)
router.get("/", auth, leaseAgreementController.getAllLeases);

// @route   GET /api/leases/:id
// @desc    Get a single lease agreement by ID
// @access  Private (Landlord, Tenant, Admin - if authorized)
router.get("/:id", auth, leaseAgreementController.getLeaseById);

// @route   PUT /api/leases/:id
// @desc    Update a lease agreement
// @access  Private (Landlord, Admin)
router.put("/:id", auth, leaseAgreementController.updateLease);

// @route   DELETE /api/leases/:id
// @desc    Delete a lease agreement
// @access  Private (Landlord, Admin)
router.delete("/:id", auth, leaseAgreementController.deleteLease);

module.exports = router;
