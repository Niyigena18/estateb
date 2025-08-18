const User = require("../models/user"); // Import your User model
const { ROLE } = require("../utils/constants"); // Assuming you have roles
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers"); // Your utility functions
const House = require("../models/House"); // Assuming you have a House model to check property ownership

/**
 * Get users by role. Only for Admins.
 */
const getUsersByRole = async (req, res) => {
  try {
    const { roleName } = req.params;
    const normalizedRole = roleName.toLowerCase();

    if (!Object.values(ROLE).includes(normalizedRole)) {
      return sendErrorResponse(
        res,
        400,
        "Invalid Role",
        `The role '${roleName}' does not exist.`
      );
    }

    const users = await User.findByRole(normalizedRole);
    sendSuccessResponse(
      res,
      200,
      `Users with role '${normalizedRole}' retrieved successfully.`,
      { users }
    );
  } catch (error) {
    console.error("Error getting users by role:", error.message);
    sendErrorResponse(res, 500, "Internal Server Error", error.message);
  }
};

/**
 * Get a single user by ID.
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

       const user = await User.findById(id);

    if (!user) {
      return sendErrorResponse(
        res,
        404,
        "Not Found",
        `User with ID ${id} not found.`
      );
    }

    sendSuccessResponse(res, 200, "User retrieved successfully.", { user });
  } catch (error) {
    console.error("Error getting user by ID:", error.message);
    sendErrorResponse(res, 500, "Internal Server Error", error.message);
  }
};

/**
 * Deactivate a tenant by setting their status to 'inactive'.
 * Requires a landlord or admin role.
 */
const deactivateTenant = async (req, res) => {
  try {
    const { id: tenantId } = req.params;
    const { id: userId, role } = req.user;

    const userToDeactivate = await User.findById(tenantId);

    if (!userToDeactivate) {
      return sendErrorResponse(
        res,
        404,
        "User Not Found",
        `User with ID ${tenantId} not found.`
      );
    }

    // Ensure the user being deactivated is a tenant and not a landlord or admin
    if (userToDeactivate.role !== ROLE.TENANT) {
      return sendErrorResponse(
        res,
        400,
        "Invalid Action",
        "Only tenants can be deactivated."
      );
    }

    // Update the tenant's status to 'inactive'
    const updated = await User.update(tenantId, { status: "inactive" });

    if (!updated) {
      return sendErrorResponse(
        res,
        500,
        "Update Failed",
        "Failed to deactivate the tenant."
      );
    }

    sendSuccessResponse(res, 200, "Tenant deactivated successfully.", {
      id: tenantId,
      status: "inactive",
    });
  } catch (error) {
    console.error("Error deactivating tenant:", error.message, error.stack);
    sendErrorResponse(res, 500, "Internal Server Error", error.message);
  }
};

// Make sure to export all functions
module.exports = {
  getUsersByRole,
  getUserById,
  deactivateTenant,
  // Export the new function
};
