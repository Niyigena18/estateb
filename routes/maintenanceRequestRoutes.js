const express = require("express");
const router = express.Router();
const maintenanceRequestController = require("../controllers/MaintenanceRequestController");
const auth = require("../middleware/auth"); // Your authentication middleware

// All maintenance request routes will be protected by the 'auth' middleware,
// meaning a valid JWT token is required to access them.

// @route   POST /api/maintenance-requests
// @desc    Submit a new maintenance request
// @access  Private (Tenant)
router.post("/", auth, maintenanceRequestController.createMaintenanceRequest);

// @route   GET /api/maintenance-requests
// @desc    Get all maintenance requests (filtered by user role)
// @access  Private (Landlord, Tenant, Admin)
router.get("/", auth, maintenanceRequestController.getAllMaintenanceRequests);

// @route   GET /api/maintenance-requests/:id
// @desc    Get a single maintenance request by ID
// @access  Private (Landlord, Tenant, Admin - if authorized)
router.get(
  "/:id",
  auth,
  maintenanceRequestController.getMaintenanceRequestById
);

// @route   PUT /api/maintenance-requests/:id
// @desc    Update a maintenance request
// @access  Private (Landlord, Admin, limited Tenant)
router.put("/:id", auth, maintenanceRequestController.updateMaintenanceRequest);

// @route   DELETE /api/maintenance-requests/:id
// @desc    Delete a maintenance request
// @access  Private (Landlord, Admin, limited Tenant)
router.delete(
  "/:id",
  auth,
  maintenanceRequestController.deleteMaintenanceRequest
);

module.exports = router;
