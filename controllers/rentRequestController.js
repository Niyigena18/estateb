// controllers/rentRequestController.js
const RentRequest = require("../models/RentRequest");
const House = require("../models/House"); // Needed to update house status
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers");
const {
  ROLE,
  RENT_REQUEST_STATUS,
  HOUSE_STATUS,
  AuthenticationError,
  ServerError,
  ValidationError,
} = require("../utils/constants");

// Helper for parsing and validating common query parameters for rent requests
const parseAndValidatePaginationParams = (reqQuery) => {
  const page = parseInt(reqQuery.page) || 1;
  const limit = parseInt(reqQuery.limit) || 10;
  const offset = (page - 1) * limit;

  if (isNaN(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }
  if (isNaN(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer.");
  }

  const filterOptions = {};
  const { status, houseId, userId, landlordId } = reqQuery; // CHANGED: tenantId -> userId
  // Added landlordId for potential admin use (this parameter is fine as is)

  if (status) {
    if (!Object.values(RENT_REQUEST_STATUS).includes(status)) {
      throw new Error(
        `Invalid status provided. Allowed values: ${Object.values(
          RENT_REQUEST_STATUS
        ).join(", ")}`
      );
    }
    filterOptions.status = status;
  }

  if (houseId) {
    const parsedHouseId = parseInt(houseId);
    if (isNaN(parsedHouseId) || parsedHouseId <= 0) {
      throw new Error("House ID must be a positive integer.");
    }
    filterOptions.houseId = parsedHouseId;
  }

  if (userId) {
    // CHANGED: tenantId -> userId
    const parsedUserId = parseInt(userId); // CHANGED: parsedTenantId -> parsedUserId
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      // CHANGED: parsedTenantId -> parsedUserId
      throw new Error("User ID must be a positive integer."); // CHANGED: Tenant ID -> User ID
    }
    filterOptions.userId = parsedUserId; // CHANGED: tenantId -> userId
  }

  if (landlordId) {
    // This filter is primarily for admin accessing 'all' or specific landlord requests
    const parsedLandlordId = parseInt(landlordId);
    if (isNaN(parsedLandlordId) || parsedLandlordId <= 0) {
      throw new Error("Landlord ID must be a positive integer.");
    }
    filterOptions.landlordId = parsedLandlordId;
  }

  return { page, limit, offset, filterOptions };
};

// @route   POST /api/rent-requests
// @desc    Create a new rent request
// @access  Private (Tenant only)
const createRentRequest = async (req, res) => {
  try {
    const { id: user_id, role } = req.user; // CHANGED: tenant_id -> user_id

    if (role !== ROLE.TENANT) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Only tenants can create rent requests."
      );
    }

    const { house_id, message } = req.body;

    if (!house_id) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.MISSING_REQUIRED_FIELDS,
        "House ID is required."
      );
    }

    // Check if house exists and is available
    const house = await House.findById(house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        `House with ID ${house_id} does not exist.`
      );
    }
    if (house.status !== HOUSE_STATUS.AVAILABLE) {
      return sendErrorResponse(
        res,
        400,
        "House Not Available",
        "This house is not available for rent."
      );
    }
    if (house.landlord_id === user_id) {
      // CHANGED: tenant_id -> user_id
      return sendErrorResponse(
        res,
        400,
        "Invalid Request",
        "You cannot send a rent request for your own house."
      );
    }

    // Prevent multiple pending requests for the same user and house
    const existingRequestsResult = await RentRequest.findByUserId(user_id, {
      // CHANGED: findByTenantId -> findByUserId, tenant_id -> user_id
      houseId: house_id,
      status: RENT_REQUEST_STATUS.PENDING,
      // We only need count, so limit and offset are not strictly necessary
      // but findByUserId returns an object with `requests` and `total`
      limit: 1, // Just check if any exist
      offset: 0,
    });

    if (existingRequestsResult && existingRequestsResult.total > 0) {
      return sendErrorResponse(
        res,
        409,
        "Conflict",
        "You already have a pending rent request for this house."
      );
    }

    const requestId = await RentRequest.create({
      user_id, // CHANGED: tenant_id -> user_id
      house_id,
      message,
    });

    sendSuccessResponse(res, 201, "Rent request created successfully.", {
      requestId,
    });
  } catch (error) {
    console.error("Error creating rent request:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   GET /api/rent-requests
// @desc    Get rent requests based on user role with pagination and filtering
// @access  Private (Tenant, Landlord, or Admin)
const getRentRequests = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    let requests, total;

    const { page, limit, offset, filterOptions } =
      parseAndValidatePaginationParams(req.query);

    if (role === ROLE.TENANT) {
      // A tenant (user) can only see their own requests
      if (filterOptions.userId && filterOptions.userId !== userId) {
        // CHANGED: tenantId -> userId
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "Tenants can only query their own requests."
        );
      }
      const result = await RentRequest.findByUserId(userId, {
        // CHANGED: findByTenantId -> findByUserId
        limit,
        offset,
        ...filterOptions,
      });
      requests = result.requests;
      total = result.total;
    } else if (role === ROLE.LANDLORD) {
      // A landlord can only see requests for their houses
      if (filterOptions.landlordId && filterOptions.landlordId !== userId) {
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "Landlords can only query requests for their own houses."
        );
      }
      const result = await RentRequest.findByLandlordId(userId, {
        limit,
        offset,
        ...filterOptions,
      });
      requests = result.requests;
      total = result.total;
    } else if (role === ROLE.ADMIN) {
      // An admin can see all requests
      const result = await RentRequest.findAll({
        limit,
        offset,
        ...filterOptions,
      });
      requests = result.requests;
      total = result.total;
    } else {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Unauthorized role to view rent requests."
      );
    }

    sendSuccessResponse(res, 200, "Rent requests retrieved successfully.", {
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting rent requests:", error.message, error.stack);
    // Use 400 for validation errors, 500 for server errors
    if (
      error.message.includes("Page must be") ||
      error.message.includes("Limit must be") ||
      error.message.includes("Invalid status") ||
      error.message.includes("ID must be")
    ) {
      sendErrorResponse(res, 400, ValidationError.INVALID_INPUT, error.message);
    } else {
      sendErrorResponse(
        res,
        500,
        ServerError.INTERNAL_SERVER_ERROR,
        error.message
      );
    }
  }
};

// @route   GET /api/rent-requests/:id
// @desc    Get a single rent request by ID
// @access  Private (Tenant/Landlord who owns/made the request, or Admin)
const getRentRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const request = await RentRequest.findById(id);

    if (!request) {
      return sendErrorResponse(
        res,
        404,
        "Rent Request Not Found",
        `Rent request with ID ${id} does not exist.`
      );
    }

    // Authorization: Tenant can see their own request, Landlord can see requests for their houses, Admin sees all
    if (role === ROLE.TENANT && request.user_id !== userId) {
      // CHANGED: request.tenant_id -> request.user_id
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to view this rent request."
      );
    }
    // For landlord, check if the house related to the request belongs to them
    if (role === ROLE.LANDLORD) {
      const house = await House.findById(request.house_id);
      if (!house || house.landlord_id !== userId) {
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "You are not authorized to view this rent request."
        );
      }
    }
    // Admin always has access

    sendSuccessResponse(res, 200, "Rent request retrieved successfully.", {
      request,
    });
  } catch (error) {
    console.error(
      "Error getting rent request by ID:",
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

// @route   PUT /api/rent-requests/:id/status
// @desc    Update the status of a rent request (accept/reject/cancel)
// @access  Private (Landlord for accept/reject, Tenant for cancel)
const updateRentRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body; // 'status' from request body
    const { id: userId, role } = req.user;

    if (!newStatus || !Object.values(RENT_REQUEST_STATUS).includes(newStatus)) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        `Invalid status provided. Allowed values: ${Object.values(
          RENT_REQUEST_STATUS
        ).join(", ")}`
      );
    }

    const request = await RentRequest.findById(id);
    if (!request) {
      return sendErrorResponse(
        res,
        404,
        "Rent Request Not Found",
        `Rent request with ID ${id} does not exist.`
      );
    }

    // Authorization checks
    const house = await House.findById(request.house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        "Associated house not found."
      );
    }

    // Landlord can ACCEPT or REJECT requests for their houses
    const isLandlordAuthorized =
      role === ROLE.LANDLORD && house.landlord_id === userId;
    // Tenant can CANCEL their own PENDING or ACCEPTED requests
    const isTenantAuthorized =
      role === ROLE.TENANT && request.user_id === userId; // CHANGED: request.tenant_id -> request.user_id
    // Admin can do anything
    const isAdminAuthorized = role === ROLE.ADMIN;

    if (!isLandlordAuthorized && !isTenantAuthorized && !isAdminAuthorized) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to change the status of this rent request."
      );
    }

    // Specific rules for status transitions
    // Admin can bypass some state checks if needed, but for now, applying universal rules.
    if (
      request.status === RENT_REQUEST_STATUS.ACCEPTED ||
      request.status === RENT_REQUEST_STATUS.REJECTED
    ) {
      // Once accepted or rejected, status cannot be changed further by most roles
      // An accepted request can be cancelled by the tenant who accepted it, or an admin
      if (
        newStatus !== RENT_REQUEST_STATUS.CANCELLED ||
        (newStatus === RENT_REQUEST_STATUS.CANCELLED &&
          !(request.user_id === userId && role === ROLE.TENANT) && // CHANGED: request.tenant_id -> request.user_id
          role !== ROLE.ADMIN)
      ) {
        return sendErrorResponse(
          res,
          400,
          "Invalid State",
          `Cannot change status from ${request.status}.`
        );
      }
    }

    if (isLandlordAuthorized || isAdminAuthorized) {
      // Landlords and Admins can accept/reject
      if (newStatus === RENT_REQUEST_STATUS.ACCEPTED) {
        // Check if house is still available before accepting
        if (house.status !== HOUSE_STATUS.AVAILABLE) {
          return sendErrorResponse(
            res,
            400,
            "House Not Available",
            "House is no longer available to be rented to this tenant."
          );
        }
        // When accepted, update house status and assign user
        await House.updateStatusAndTenant(
          request.house_id,
          HOUSE_STATUS.RENTED,
          request.user_id // CHANGED: request.tenant_id -> request.user_id
        );
        // Also, reject all other pending requests for this house
        const pendingRequestsForHouseResult = await RentRequest.findAll({
          houseId: request.house_id,
          status: RENT_REQUEST_STATUS.PENDING,
          limit: 9999, // Fetch all for this house
          offset: 0,
        });

        for (const pendingReq of pendingRequestsForHouseResult.requests) {
          if (pendingReq.id !== request.id) {
            await RentRequest.updateStatus(
              pendingReq.id,
              RENT_REQUEST_STATUS.REJECTED
            );
          }
        }
      } else if (newStatus === RENT_REQUEST_STATUS.REJECTED) {
        // If a previously accepted request is rejected, make house available (if it was rented by this user)
        if (
          request.status === RENT_REQUEST_STATUS.ACCEPTED &&
          house.tenant_id === request.user_id // CHANGED: request.tenant_id -> request.user_id (assuming house.tenant_id is for the current tenant)
        ) {
          await House.updateStatusAndTenant(
            request.house_id,
            HOUSE_STATUS.AVAILABLE,
            null
          );
        }
      } else if (newStatus === RENT_REQUEST_STATUS.PENDING) {
        if (!isAdminAuthorized) {
          // Only admin can potentially revert to pending for data correction
          return sendErrorResponse(
            res,
            400,
            "Invalid State",
            "Landlords cannot set status back to pending."
          );
        }
      }
    } else if (isTenantAuthorized) {
      // Only tenants can cancel their own requests
      if (newStatus === RENT_REQUEST_STATUS.CANCELLED) {
        // A tenant can cancel their own pending or accepted request
        if (request.status === RENT_REQUEST_STATUS.ACCEPTED) {
          // If tenant cancels an accepted request, unassign them from the house
          if (house.tenant_id === request.user_id) {
            // CHANGED: request.tenant_id -> request.user_id
            // Only if this tenant is currently assigned
            await House.updateStatusAndTenant(
              request.house_id,
              HOUSE_STATUS.AVAILABLE,
              null
            );
          }
        }
      } else {
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "Tenants can only cancel their own rent requests."
        );
      }
    }

    const updated = await RentRequest.updateStatus(id, newStatus);

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        "Update Failed",
        "Failed to update rent request status."
      );
    }

    sendSuccessResponse(res, 200, "Rent request status updated successfully.", {
      id,
      newStatus,
    });
  } catch (error) {
    console.error(
      "Error updating rent request status:",
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

// @route   DELETE /api/rent-requests/:id
// @desc    Delete a rent request
// @access  Private (Landlord or Tenant or Admin) - tenant/landlord only if pending
const deleteRentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const request = await RentRequest.findById(id);
    if (!request) {
      return sendErrorResponse(
        res,
        404,
        "Rent Request Not Found",
        `Rent request with ID ${id} does not exist.`
      );
    }

    // Authorization: Only the user who made the request OR the landlord of the house OR an Admin can delete
    // A request should typically only be deleted if it's PENDING.
    const house = await House.findById(request.house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        "Associated house not found."
      );
    }

    const isTenantAuthorized =
      role === ROLE.TENANT && request.user_id === userId; // CHANGED: request.tenant_id -> request.user_id
    const isLandlordAuthorized =
      role === ROLE.LANDLORD && house.landlord_id === userId;
    const isAdminAuthorized = role === ROLE.ADMIN;

    if (!isTenantAuthorized && !isLandlordAuthorized && !isAdminAuthorized) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to delete this rent request."
      );
    }

    // // Only allow deletion if the request is pending, or if an admin is deleting
    // if (request.status !== RENT_REQUEST_STATUS.PENDING && role !== ROLE.ADMIN) {
    //   return sendErrorResponse(
    //     res,
    //     400,
    //     "Invalid State",
    //     "Only pending rent requests can be deleted by tenants/landlords."
    //   );
    // }

    const deleted = await RentRequest.delete(id);

    if (!deleted) {
      return sendErrorResponse(
        res,
        400,
        "Delete Failed",
        "Failed to delete rent request."
      );
    }

    sendSuccessResponse(res, 200, "Rent request deleted successfully.", { id });
  } catch (error) {
    console.error("Error deleting rent request:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

module.exports = {
  createRentRequest,
  getRentRequests, // <-- This is the new, combined function
  getRentRequestById,
  updateRentRequestStatus,
  deleteRentRequest,
};
