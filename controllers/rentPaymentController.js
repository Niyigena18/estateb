const RentPayment = require("../models/RentPayment");
const House = require("../models/House");
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
    const { id: userId, role } = req.user;
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

    if (role !== ROLE.LANDLORD) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Only landlords can create rent payment records."
      );
    }

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
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You can only create payment records for your own properties."
      );
    }
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
      status: status || PAYMENT_STATUS.PENDING,
      payment_method: payment_method || null,
      payment_date: payment_date || null,
      receipt_url: receipt_url || null,
    };

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
      payments = await RentPayment.findByLandlordId(userId);
      sendSuccessResponse(
        res,
        200,
        "Rent payments for your properties retrieved successfully.",
        { payments }
      );
    } else {
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

    if (role === ROLE.TENANT && payment.tenant_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to view this rent payment record."
      );
    }
    if (role === ROLE.LANDLORD && payment.landlord_id !== userId) {
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

    const house = await House.findById(payment.house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        500,
        ServerError.INTERNAL_SERVER_ERROR,
        "Associated house not found for this payment record."
      );
    }

    if (role !== ROLE.LANDLORD || house.landlord_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to update this rent payment record."
      );
    }

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

// @route   PUT /api/rent-payments/pay/:id
// @desc    Tenant makes a payment
// @access  Private (Tenant only)
const makePayment = async (req, res) => {
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
        "The specified payment record does not exist."
      );
    }

    if (role !== ROLE.TENANT || payment.tenant_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to make this payment."
      );
    }

    if (payment.status === PAYMENT_STATUS.PAID) {
      return sendErrorResponse(
        res,
        400,
        "Payment Already Made",
        "This payment has already been paid in full."
      );
    }

    const updatedPaymentData = {
      paid_amount: (payment.paid_amount || 0) + updates.amount,
      payment_method: updates.payment_method,
      payment_date: new Date(),
      status:
        (payment.paid_amount || 0) + updates.amount >= payment.amount
          ? PAYMENT_STATUS.PAID
          : PAYMENT_STATUS.PENDING,
    };

    const updated = await RentPayment.update(paymentId, updatedPaymentData);

    if (!updated) {
      throw new Error("Failed to update payment record.");
    }

    sendSuccessResponse(res, 200, "Payment recorded successfully.", {
      paymentId,
    });
  } catch (error) {
    console.error("Error making payment:", error.message, error.stack);
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

    const house = await House.findById(payment.house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        500,
        ServerError.INTERNAL_SERVER_ERROR,
        "Associated house not found for this payment record."
      );
    }

    if (role !== ROLE.LANDLORD || house.landlord_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to delete this rent payment record."
      );
    }

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
  makePayment,
  deleteRentPayment,
  makePayment,
};
