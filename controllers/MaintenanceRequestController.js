const MaintenanceRequest = require("../models/MaintenanceRequest");
const User = require("../models/user"); // To verify tenant/landlord existence
const House = require("../models/House");
const Notification = require("../models/Notification"); // To verify house existence and ownership
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers");
const {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  ServerError,
} = require("../utils/constants");

// @route   POST /api/maintenance-requests
// @desc    Submit a new maintenance request
// @access  Private (Tenant)
const createMaintenanceRequest = async (req, res) => {
  try {
    const { house_id, title, description, category, media_urls } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // 1. Authorization: Only tenants can submit requests
    if (currentUserRole !== "tenant") {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Only tenants can submit maintenance requests."
      );
    }

    // 2. Basic Input Validation
    if (!house_id || !title || !description || !category) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.MISSING_FIELDS,
        "House ID, Title, Description, and Category are required."
      );
    }

    // 3. Verify existence of House and Tenant, and tenant's relationship to house
    const house = await House.findById(house_id);
    if (!house) {
      return sendErrorResponse(res, 404, NotFoundError.HOUSE_NOT_FOUND);
    }

    const tenant = await User.findById(currentUserId);
    if (!tenant || tenant.role !== "tenant") {
      return sendErrorResponse(res, 404, NotFoundError.TENANT_NOT_FOUND);
    }

    // Derive landlord_id from the house, ensuring it's null if not set
    const landlord_id = house.landlord_id || null; // Ensure landlord_id is null if undefined

    const requestId = await MaintenanceRequest.create({
      house_id,
      tenant_id: currentUserId, // REVERTED: Back to tenant_id
      landlord_id,
      title,
      description,
      category,
      media_urls,
    });

    sendSuccessResponse(
      res,
      201,
      "Maintenance request submitted successfully",
      {
        requestId,
      }
    );
  } catch (error) {
    console.error(
      "Error creating maintenance request:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   GET /api/maintenance-requests
// @desc    Get all maintenance requests (filtered by role)
// @access  Private (Landlord, Tenant, Admin)
const getAllMaintenanceRequests = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    let requests;
    if (currentUserRole === "admin") {
      requests = await MaintenanceRequest.getAll();
    } else if (currentUserRole === "landlord") {
      requests = await MaintenanceRequest.findByLandlordId(currentUserId);
    } else if (currentUserRole === "tenant") {
      // REVERTED: Back to findByTenantId
      requests = await MaintenanceRequest.findByTenantId(currentUserId);
    } else {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Your role does not permit viewing maintenance requests."
      );
    }

    if (!requests || requests.length === 0) {
      return sendSuccessResponse(
        res,
        200,
        "No maintenance requests found.",
        []
      );
    }

    sendSuccessResponse(
      res,
      200,
      "Maintenance requests retrieved successfully",
      {
        requests,
      }
    );
  } catch (error) {
    console.error(
      "Error getting all maintenance requests:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   GET /api/maintenance-requests/:id
// @desc    Get a single maintenance request by ID
// @access  Private (Landlord, Tenant, Admin - if authorized)
const getMaintenanceRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const request = await MaintenanceRequest.findById(id);

    if (!request) {
      return sendErrorResponse(
        res,
        404,
        NotFoundError.MAINTENANCE_REQUEST_NOT_FOUND
      );
    }

    // Authorization: Admin can see any; Landlord/Tenant can only see their own
    if (
      currentUserRole === "landlord" &&
      request.landlord_id !== currentUserId
    ) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to view this maintenance request."
      );
    }
    // REVERTED: Back to request.tenant_id
    if (currentUserRole === "tenant" && request.tenant_id !== currentUserId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to view this maintenance request."
      );
    }
    if (
      currentUserRole !== "admin" &&
      currentUserRole !== "landlord" &&
      currentUserRole !== "tenant"
    ) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Your role does not permit viewing maintenance requests."
      );
    }

    sendSuccessResponse(
      res,
      200,
      "Maintenance request retrieved successfully",
      {
        request,
      }
    );
  } catch (error) {
    console.error(
      "Error getting maintenance request by ID:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   PUT /api/maintenance-requests/:id
// @desc    Update a maintenance request
// @access  Private (Landlord, Admin, limited Tenant)
const updateMaintenanceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return sendErrorResponse(
        res,
        404,
        NotFoundError.MAINTENANCE_REQUEST_NOT_FOUND
      );
    }

    // Authorization logic based on roles and who owns the request
    if (currentUserRole === "admin") {
      // Admin can update anything.
    } else if (currentUserRole === "landlord") {
      // Landlord can only update requests for their properties.
      if (request.landlord_id !== currentUserId) {
        return sendErrorResponse(
          res,
          403,
          AuthorizationError.NOT_AUTHORIZED,
          "You are not authorized to update this maintenance request."
        );
      }
      // Landlords cannot change house_id, tenant_id, landlord_id
      delete updateData.house_id;
      // REVERTED: Back to tenant_id
      delete updateData.tenant_id;
      delete updateData.landlord_id;
    } else if (currentUserRole === "tenant") {
      // Tenants can only update their own requests.
      // REVERTED: Back to request.tenant_id
      if (request.tenant_id !== currentUserId) {
        return sendErrorResponse(
          res,
          403,
          AuthorizationError.NOT_AUTHORIZED,
          "You are not authorized to update this maintenance request."
        );
      }
      // Tenants have limited update capabilities
      const allowedTenantUpdates = ["description", "media_urls"];
      const forbiddenTenantUpdates = Object.keys(updateData).filter(
        (key) => !allowedTenantUpdates.includes(key)
      );

      if (forbiddenTenantUpdates.length > 0) {
        return sendErrorResponse(
          res,
          403,
          AuthorizationError.NOT_AUTHORIZED,
          `Tenants cannot update: ${forbiddenTenantUpdates.join(
            ", "
          )}. Only description and media_urls are allowed.`
        );
      }

      // Also, tenants shouldn't update if request is already processed
      if (request.status === "In Progress" || request.status === "Completed") {
        return sendErrorResponse(
          res,
          403,
          AuthorizationError.NOT_AUTHORIZED,
          "Cannot modify a maintenance request that is in progress or completed."
        );
      }
    } else {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Your role does not permit updating maintenance requests."
      );
    }

    const updated = await MaintenanceRequest.update(id, updateData);

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        ServerError.OPERATION_FAILED,
        "Failed to update maintenance request. No changes or invalid data."
      );
    }

    sendSuccessResponse(res, 200, "Maintenance request updated successfully");
  } catch (error) {
    console.error(
      "Error updating maintenance request:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   DELETE /api/maintenance-requests/:id
// @desc    Delete a maintenance request
// @access  Private (Landlord, Admin, limited Tenant)
const deleteMaintenanceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return sendErrorResponse(
        res,
        404,
        NotFoundError.MAINTENANCE_REQUEST_NOT_FOUND
      );
    }

    // Authorization: Admin can delete any. Landlord can delete their own.
    // Tenant can only delete if the request status is 'New'.
    if (currentUserRole === "admin") {
      // Admin can delete any request
    } else if (currentUserRole === "landlord") {
      if (request.landlord_id !== currentUserId) {
        return sendErrorResponse(
          res,
          403,
          AuthorizationError.NOT_AUTHORIZED,
          "You are not authorized to delete this maintenance request."
        );
      }
    } else if (currentUserRole === "tenant") {
      // REVERTED: Back to request.tenant_id
      if (request.tenant_id !== currentUserId) {
        return sendErrorResponse(
          res,
          403,
          AuthorizationError.NOT_AUTHORIZED,
          "You are not authorized to delete this maintenance request."
        );
      }
      // Tenant can only delete if status is 'New'
      if (request.status !== "New") {
        return sendErrorResponse(
          res,
          403,
          AuthorizationError.NOT_AUTHORIZED,
          "Cannot delete a maintenance request that is no longer 'New'."
        );
      }
    } else {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Your role does not permit deleting maintenance requests."
      );
    }

    const deleted = await MaintenanceRequest.delete(id);

    if (!deleted) {
      return sendErrorResponse(
        res,
        400,
        ServerError.OPERATION_FAILED,
        "Failed to delete maintenance request."
      );
    }

    sendSuccessResponse(res, 200, "Maintenance request deleted successfully");
  } catch (error) {
    console.error(
      "Error deleting maintenance request:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

module.exports = {
  createMaintenanceRequest,
  getAllMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
};
