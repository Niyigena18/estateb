const LeaseAgreement = require("../models/LeaseAgreement");
const User = require("../models/user"); // Needed to verify landlord/tenant existence
const House = require("../models/House"); // Needed to verify house existence and ownership
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers");
const {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  ServerError,
} = require("../utils/constants");

// @route   POST /api/leases
// @desc    Create a new lease agreement
// @access  Private (Landlord, Admin)
const createLease = async (req, res) => {
  try {
    const {
      house_id,
      tenant_id,
      start_date,
      end_date,
      rent_amount,
      deposit_amount,
      terms,
      status, // Optional, defaults to 'pending'
      document_url,
    } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // 1. Basic Input Validation
    if (
      !house_id ||
      !tenant_id ||
      !start_date ||
      !end_date ||
      !rent_amount ||
      !deposit_amount ||
      !terms
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.MISSING_FIELDS,
        "All required lease fields are missing."
      );
    }

    // 2. Validate Dates
    if (new Date(start_date) >= new Date(end_date)) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_DATE_RANGE,
        "End date must be after start date."
      );
    }

    // 3. Verify existence of House and Tenant
    const house = await House.findById(house_id);
    if (!house) {
      return sendErrorResponse(res, 404, NotFoundError.HOUSE_NOT_FOUND);
    }

    const tenant = await User.findById(tenant_id);
    if (!tenant || tenant.role !== "tenant") {
      return sendErrorResponse(res, 404, NotFoundError.TENANT_NOT_FOUND);
    }

    // 4. Authorization: Only Landlord (for their properties) or Admin can create
    if (currentUserRole === "landlord" && house.landlord_id !== currentUserId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You can only create leases for your own properties."
      );
    } else if (currentUserRole !== "admin" && currentUserRole !== "landlord") {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Only landlords or administrators can create lease agreements."
      );
    }

    // Use the house's landlord_id as the landlord_id for the lease
    const landlord_id = house.landlord_id;

    const leaseId = await LeaseAgreement.create({
      house_id,
      tenant_id,
      landlord_id, // This is derived from the house, not user input
      start_date,
      end_date,
      rent_amount,
      deposit_amount,
      terms,
      status,
      document_url,
    });

    sendSuccessResponse(res, 201, "Lease agreement created successfully", {
      leaseId,
    });
  } catch (error) {
    console.error(
      "Error creating lease agreement:",
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

// @route   GET /api/leases
// @desc    Get all lease agreements (filtered by role)
// @access  Private (Landlord, Tenant, Admin)
const getAllLeases = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    let leases;
    if (currentUserRole === "admin") {
      leases = await LeaseAgreement.getAll(); // Assuming a getAll method in model
    } else if (currentUserRole === "landlord") {
      leases = await LeaseAgreement.findByLandlordId(currentUserId);
    } else if (currentUserRole === "tenant") {
      leases = await LeaseAgreement.findByTenantId(currentUserId);
    } else {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Your role does not permit viewing lease agreements."
      );
    }

    if (!leases || leases.length === 0) {
      return sendSuccessResponse(res, 200, "No lease agreements found.", []);
    }

    sendSuccessResponse(res, 200, "Lease agreements retrieved successfully", {
      leases,
    });
  } catch (error) {
    console.error(
      "Error getting all lease agreements:",
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

// @route   GET /api/leases/:id
// @desc    Get a single lease agreement by ID
// @access  Private (Landlord, Tenant, Admin - if authorized)
const getLeaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const lease = await LeaseAgreement.findById(id);

    if (!lease) {
      return sendErrorResponse(res, 404, NotFoundError.LEASE_NOT_FOUND);
    }

    // Authorization: Admin can see any, Landlord/Tenant can only see their own
    if (currentUserRole === "landlord" && lease.landlord_id !== currentUserId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to view this lease agreement."
      );
    }
    if (currentUserRole === "tenant" && lease.tenant_id !== currentUserId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to view this lease agreement."
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
        "Your role does not permit viewing lease agreements."
      );
    }

    sendSuccessResponse(res, 200, "Lease agreement retrieved successfully", {
      lease,
    });
  } catch (error) {
    console.error(
      "Error getting lease agreement by ID:",
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

// @route   PUT /api/leases/:id
// @desc    Update a lease agreement
// @access  Private (Landlord, Admin)
const updateLease = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const lease = await LeaseAgreement.findById(id);
    if (!lease) {
      return sendErrorResponse(res, 404, NotFoundError.LEASE_NOT_FOUND);
    }

    // Authorization: Admin can update any, Landlord can only update their own properties' leases
    if (currentUserRole === "landlord" && lease.landlord_id !== currentUserId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to update this lease agreement."
      );
    } else if (currentUserRole !== "admin" && currentUserRole !== "landlord") {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Only landlords or administrators can update lease agreements."
      );
    }

    // Prevent direct update of sensitive IDs if not admin
    if (currentUserRole !== "admin") {
      delete updateData.house_id;
      delete updateData.tenant_id;
      delete updateData.landlord_id;
    }

    const updated = await LeaseAgreement.update(id, updateData);

    if (!updated) {
      // This might happen if ID is valid but no fields changed, or a DB error
      return sendErrorResponse(
        res,
        400,
        ServerError.OPERATION_FAILED,
        "Failed to update lease agreement. No changes or invalid data."
      );
    }

    sendSuccessResponse(res, 200, "Lease agreement updated successfully");
  } catch (error) {
    console.error(
      "Error updating lease agreement:",
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

// @route   DELETE /api/leases/:id
// @desc    Delete a lease agreement
// @access  Private (Landlord, Admin)
const deleteLease = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    const lease = await LeaseAgreement.findById(id);
    if (!lease) {
      return sendErrorResponse(res, 404, NotFoundError.LEASE_NOT_FOUND);
    }

    // Authorization: Admin can delete any, Landlord can only delete their own properties' leases
    if (currentUserRole === "landlord" && lease.landlord_id !== currentUserId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to delete this lease agreement."
      );
    } else if (currentUserRole !== "admin" && currentUserRole !== "landlord") {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "Only landlords or administrators can delete lease agreements."
      );
    }

    const deleted = await LeaseAgreement.delete(id);

    if (!deleted) {
      return sendErrorResponse(
        res,
        400,
        ServerError.OPERATION_FAILED,
        "Failed to delete lease agreement."
      );
    }

    sendSuccessResponse(res, 200, "Lease agreement deleted successfully");
  } catch (error) {
    console.error(
      "Error deleting lease agreement:",
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
  createLease,
  getAllLeases,
  getLeaseById,
  updateLease,
  deleteLease,
};
