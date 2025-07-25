// controllers/rentPaymentController.js
const RentPayment = require("../models/RentPayment");
const House = require("../models/House"); // Needed to potentially link payments to landlord's houses
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers");
const {
  ROLE,
  PAYMENT_STATUS,
  AuthenticationError,
  ServerError,
  ValidationError,
} = require("../utils/constants");

// @route   POST /api/rent-payments
// @desc    Create a new rent payment record (typically by Landlord or system)
// @access  Private (Landlord or Admin)
const createRentPayment = async (req, res) => {
  try {
    const { id: userId, role } = req.user; // Authenticated user
    const {
      tenant_id,
      house_id,
      due_date,
      amount,
      paid_amount,
      status,
      payment_method,
      payment_date,
      receipt_url,
    } = req.body;

    // Only landlords (or admins if you implement that role) should create payment records
    if (role !== ROLE.LANDLORD) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Only landlords can create rent payment records."
      );
    }

    // Basic validation for required fields
    if (!tenant_id || !house_id || !due_date || !amount) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Tenant ID, House ID, Due Date, and Amount are required."
      );
    }
    if (typeof amount !== "number" || amount <= 0) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Amount must be a positive number."
      );
    }

    // Optional: Verify if the tenant is actually assigned to this house
    const house = await House.findById(house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        `House with ID ${house_id} does not exist.`
      );
    }
    if (house.landlord_id !== userId) {
      // Landlord can only create payments for their own houses
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You can only create payment records for your own properties."
      );
    }
    // Strict check: Only create if the tenant_id matches the house's current tenant_id (if assigned)
    if (house.tenant_id !== tenant_id) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        `Tenant ${tenant_id} is not assigned to house ${house_id}.`
      );
    }

    const newPaymentData = {
      tenant_id,
      house_id,
      due_date,
      amount,
      paid_amount: paid_amount !== undefined ? paid_amount : 0,
      status: status || PAYMENT_STATUS.PENDING, // Default to pending if not provided
      payment_method: payment_method || null,
      payment_date: payment_date || null,
      receipt_url: receipt_url || null,
    };

    // Validate provided status if it exists
    if (
      newPaymentData.status &&
      !Object.values(PAYMENT_STATUS).includes(newPaymentData.status)
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        `Invalid status: ${newPaymentData.status}. Allowed are: ${Object.values(
          PAYMENT_STATUS
        ).join(", ")}.`
      );
    }

    const paymentId = await RentPayment.create(newPaymentData);

    sendSuccessResponse(res, 201, "Rent payment record created successfully", {
      paymentId,
      ...newPaymentData,
    });
  } catch (error) {
    console.error(
      "Error creating rent payment record:",
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

// @route   GET /api/rent-payments
// @desc    Get all rent payment records (Landlord can see all for their houses, Tenant can see their own)
// @access  Private (Tenant or Landlord)
const getRentPayments = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    let payments;

    if (role === ROLE.TENANT) {
      payments = await RentPayment.findByTenantId(userId);
      sendSuccessResponse(
        res,
        200,
        "Your rent payments retrieved successfully.",
        { payments }
      );
    } else if (role === ROLE.LANDLORD) {
      payments = await RentPayment.findByLandlordId(userId); // userId here is landlordId
      sendSuccessResponse(
        res,
        200,
        "Rent payments for your properties retrieved successfully.",
        { payments }
      );
    } else {
      // For any other roles not explicitly handled (e.g., if you introduce 'admin' later)
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to view rent payment records."
      );
    }
  } catch (error) {
    console.error("Error getting rent payments:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   GET /api/rent-payments/:id
// @desc    Get a single rent payment record by ID (Owner Tenant or Landlord of house)
// @access  Private (Tenant or Landlord)
const getRentPaymentById = async (req, res) => {
  try {
    const { id: paymentId } = req.params;
    const { id: userId, role } = req.user;

    const payment = await RentPayment.findById(paymentId);

    if (!payment) {
      return sendErrorResponse(
        res,
        404,
        "Payment Record Not Found",
        `Rent payment record with ID ${paymentId} does not exist.`
      );
    }

    // Authorization check: Tenant can only see their own payment, Landlord can only see payments for their houses
    if (role === ROLE.TENANT && payment.tenant_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to view this rent payment record."
      );
    }
    if (role === ROLE.LANDLORD && payment.landlord_id !== userId) {
      // payment.landlord_id comes from the join in model
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to view this rent payment record."
      );
    }

    sendSuccessResponse(
      res,
      200,
      "Rent payment record retrieved successfully.",
      { payment }
    );
  } catch (error) {
    console.error(
      "Error getting rent payment by ID:",
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

// @route   PUT /api/rent-payments/:id
// @desc    Update a rent payment record
// @access  Private (Landlord only for their houses, or Admin)
const updateRentPayment = async (req, res) => {
  try {
    const { id: paymentId } = req.params;
    const { id: userId, role } = req.user;
    const updates = req.body;

    const payment = await RentPayment.findById(paymentId);
    if (!payment) {
      return sendErrorResponse(
        res,
        404,
        "Payment Record Not Found",
        `Rent payment record with ID ${paymentId} does not exist.`
      );
    }

    // Get the house linked to this payment to check landlord ownership
    const house = await House.findById(payment.house_id);
    if (!house) {
      // This should ideally not happen if data integrity is maintained, but good for robustness
      return sendErrorResponse(
        res,
        500,
        ServerError.INTERNAL_SERVER_ERROR,
        "Associated house not found for this payment record."
      );
    }

    // Authorization: Only the landlord who owns the house associated with the payment (or Admin) can update
    if (role !== ROLE.LANDLORD || house.landlord_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to update this rent payment record."
      );
    }
    // If you had an 'admin' role, you'd add:
    // if (role !== ROLE.LANDLORD && role !== ROLE.ADMIN) { ... }

    // Validate status if it's being updated
    if (
      updates.status &&
      !Object.values(PAYMENT_STATUS).includes(updates.status)
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        `Invalid status: ${updates.status}. Allowed are: ${Object.values(
          PAYMENT_STATUS
        ).join(", ")}.`
      );
    }
    // Ensure paid_amount is a number if provided
    if (
      updates.paid_amount !== undefined &&
      typeof updates.paid_amount !== "number"
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Paid amount must be a number."
      );
    }

    const updated = await RentPayment.update(paymentId, updates);

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        "Update Failed",
        "Failed to update rent payment record. No valid fields provided or record not found."
      );
    }

    sendSuccessResponse(res, 200, "Rent payment record updated successfully.", {
      paymentId,
      ...updates,
    });
  } catch (error) {
    console.error("Error updating rent payment:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   DELETE /api/rent-payments/:id
// @desc    Delete a rent payment record
// @access  Private (Landlord only for their houses, or Admin)
const deleteRentPayment = async (req, res) => {
  try {
    const { id: paymentId } = req.params;
    const { id: userId, role } = req.user;

    const payment = await RentPayment.findById(paymentId);
    if (!payment) {
      return sendErrorResponse(
        res,
        404,
        "Payment Record Not Found",
        `Rent payment record with ID ${paymentId} does not exist.`
      );
    }

    // Get the house linked to this payment to check landlord ownership
    const house = await House.findById(payment.house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        500,
        ServerError.INTERNAL_SERVER_ERROR,
        "Associated house not found for this payment record."
      );
    }

    // Authorization: Only the landlord who owns the house associated with the payment (or Admin) can delete
    if (role !== ROLE.LANDLORD || house.landlord_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to delete this rent payment record."
      );
    }
    // If you had an 'admin' role, you'd add:
    // if (role !== ROLE.LANDLORD && role !== ROLE.ADMIN) { ... }

    const deleted = await RentPayment.delete(paymentId);

    if (!deleted) {
      return sendErrorResponse(
        res,
        400,
        "Delete Failed",
        "Failed to delete rent payment record."
      );
    }

    sendSuccessResponse(res, 200, "Rent payment record deleted successfully.", {
      paymentId,
    });
  } catch (error) {
    console.error("Error deleting rent payment:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

module.exports = {
  createRentPayment,
  getRentPayments,
  getRentPaymentById,
  updateRentPayment,
  deleteRentPayment,
};
