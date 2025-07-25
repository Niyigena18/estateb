// routes/houses.js
const express = require("express");
const router = express.Router();
const houseController = require("../controllers/houseController"); // Import the house controller
const auth = require("../middleware/auth"); // Import the authentication middleware
const authorizeRole = require("../middleware/authorizeRole"); // Import the authorization middleware
const { ROLE } = require("../utils/constants"); // Import roles for authorizeRole

// @route   POST /api/houses
// @desc    Add a new house listing
// @access  Private (Landlord only)
// Requires authentication and landlord role
router.post(
  "/",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  houseController.createHouse
);

// @route   GET /api/houses
// @desc    Get all house listings (with optional search/filter)
// @access  Public (no authentication required to view listings)
router.get("/", houseController.getHouses);

// @route   GET /api/houses/:id
// @desc    Get a single house listing by ID
// @access  Public (no authentication required)
router.get("/:id", houseController.getHouseById);

// @route   PUT /api/houses/:id
// @desc    Update a house listing
// @access  Private (Landlord who owns the house, or Admin - authorization handled in controller)
// Requires authentication and landlord role (or admin role if you add one later)
router.put(
  "/:id",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  houseController.updateHouse
);

// @route   DELETE /api/houses/:id
// @desc    Delete a house listing
// @access  Private (Landlord who owns the house, or Admin - authorization handled in controller)
// Requires authentication and landlord role (or admin role if you add one later)
router.delete(
  "/:id",
  auth,
  authorizeRole([ROLE.LANDLORD]),
  houseController.deleteHouse
);

module.exports = router;
