// controllers/rentReminderController.js
const RentReminder = require("../models/RentReminder");
const House = require("../models/House"); // To check house ownership/existence
const RentPayment = require("../models/RentPayment"); // To check payment existence/details
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers");
const {
  ROLE,
  REMINDER_TYPE,
  AuthenticationError,
  ServerError,
  ValidationError,
} = require("../utils/constants");

// Helper for parsing and validating common query parameters
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
  const {
    type,
    isSent,
    houseId,
    tenantId,
    landlordId,
    reminderDateBefore,
    reminderDateAfter,
  } = reqQuery;

  if (type) {
    if (!Object.values(REMINDER_TYPE).includes(type)) {
      throw new Error(
        `Invalid reminder type provided. Allowed values: ${Object.values(
          REMINDER_TYPE
        ).join(", ")}`
      );
    }
    filterOptions.type = type;
  }

  if (isSent !== undefined) {
    // Check for undefined specifically to allow false
    if (isSent === "true") {
      filterOptions.isSent = true;
    } else if (isSent === "false") {
      filterOptions.isSent = false;
    } else {
      throw new Error("isSent must be a boolean value (true or false).");
    }
  }

  if (houseId) {
    const parsedHouseId = parseInt(houseId);
    if (isNaN(parsedHouseId) || parsedHouseId <= 0) {
      throw new Error("House ID must be a positive integer.");
    }
    filterOptions.houseId = parsedHouseId;
  }

  if (tenantId) {
    const parsedTenantId = parseInt(tenantId);
    if (isNaN(parsedTenantId) || parsedTenantId <= 0) {
      throw new Error("Tenant ID must be a positive integer.");
    }
    filterOptions.tenantId = parsedTenantId;
  }

  if (landlordId) {
    // Only applicable for getAllReminders
    const parsedLandlordId = parseInt(landlordId);
    if (isNaN(parsedLandlordId) || parsedLandlordId <= 0) {
      throw new Error("Landlord ID must be a positive integer.");
    }
    filterOptions.landlordId = parsedLandlordId;
  }

  // Date filters (assuming YYYY-MM-DD format for simplicity)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (reminderDateBefore) {
    if (!dateRegex.test(reminderDateBefore)) {
      throw new Error("reminderDateBefore must be in YYYY-MM-DD format.");
    }
    filterOptions.reminderDateBefore = reminderDateBefore;
  }
  if (reminderDateAfter) {
    if (!dateRegex.test(reminderDateAfter)) {
      throw new Error("reminderDateAfter must be in YYYY-MM-DD format.");
    }
    filterOptions.reminderDateAfter = reminderDateAfter;
  }

  return { page, limit, offset, filterOptions };
};

// @route   POST /api/reminders
// @desc    Create a new rent reminder (typically automated or by landlord)
// @access  Private (Landlord or System)
const createRentReminder = async (req, res) => {
  try {
    const { id: userId, role } = req.user; // Assuming landlord creates it

    const {
      tenant_id,
      house_id,
      payment_id, // Optional, can link to a specific payment record
      reminder_date, // When the reminder should trigger/is due
      type, // e.g., 'payment_due', 'payment_overdue'
      message,
      is_sent = false, // Default to not sent
    } = req.body;

    if (role !== ROLE.LANDLORD && role !== ROLE.ADMIN) {
      // Assuming admin can also create reminders
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Only landlords or authorized systems can create reminders."
      );
    }

    // Basic validation
    if (!tenant_id || !house_id || !reminder_date || !type || !message) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.MISSING_REQUIRED_FIELDS,
        "Tenant ID, House ID, Reminder Date, Type, and Message are required."
      );
    }
    if (!Object.values(REMINDER_TYPE).includes(type)) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        `Invalid reminder type. Allowed: ${Object.values(REMINDER_TYPE).join(
          ", "
        )}`
      );
    }
    if (isNaN(new Date(reminder_date).getTime())) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Invalid reminder_date format."
      );
    }

    // Optional: Verify house ownership if landlord is creating
    const house = await House.findById(house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        `House with ID ${house_id} not found.`
      );
    }
    if (house.landlord_id !== userId && role !== ROLE.ADMIN) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You can only create reminders for your own houses."
      );
    }
    if (house.tenant_id !== tenant_id) {
      return sendErrorResponse(
        res,
        400,
        "Invalid Tenant",
        "The provided tenant is not associated with this house."
      );
    }

    // Optional: Verify payment_id if provided
    if (payment_id) {
      const payment = await RentPayment.findById(payment_id);
      if (
        !payment ||
        payment.house_id !== house_id ||
        payment.tenant_id !== tenant_id
      ) {
        return sendErrorResponse(
          res,
          400,
          "Invalid Payment ID",
          "Provided payment ID is invalid or does not match house/tenant."
        );
      }
    }

    const reminderId = await RentReminder.create({
      tenant_id,
      house_id,
      payment_id,
      reminder_date,
      type,
      message,
      is_sent,
    });

    sendSuccessResponse(res, 201, "Rent reminder created successfully.", {
      reminderId,
    });
  } catch (error) {
    console.error("Error creating rent reminder:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   GET /api/reminders
// @desc    Get rent reminders based on user role with pagination and filtering
// @access  Private (Tenant, Landlord, or Admin)
const getRentReminders = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    let reminders, total;

    const { page, limit, offset, filterOptions } =
      parseAndValidatePaginationParams(req.query);

    if (role === ROLE.TENANT) {
      // A tenant can only see their own reminders
      if (filterOptions.tenantId && filterOptions.tenantId !== userId) {
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "Tenants can only query their own reminders."
        );
      }
      const result = await RentReminder.findByTenantId(userId, {
        limit,
        offset,
        ...filterOptions,
      });
      reminders = result.reminders;
      total = result.total;
    } else if (role === ROLE.LANDLORD) {
      // A landlord can only see reminders for houses they own
      if (filterOptions.landlordId && filterOptions.landlordId !== userId) {
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "Landlords can only query reminders for their own houses."
        );
      }
      const result = await RentReminder.findByLandlordId(userId, {
        limit,
        offset,
        ...filterOptions,
      });
      reminders = result.reminders;
      total = result.total;
    } else if (role === ROLE.ADMIN) {
      // An admin can see all reminders
      const result = await RentReminder.findAll({
        limit,
        offset,
        ...filterOptions,
      });
      reminders = result.reminders;
      total = result.total;
    } else {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Unauthorized role to view rent reminders."
      );
    }

    sendSuccessResponse(res, 200, "Rent reminders retrieved successfully.", {
      reminders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting rent reminders:", error.message, error.stack);
    // Use 400 for validation errors, 500 for server errors
    if (
      error.message.includes("Page must be") ||
      error.message.includes("Limit must be") ||
      error.message.includes("Invalid") ||
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

// @route   GET /api/reminders/:id
// @desc    Get a single rent reminder by ID
// @access  Private (Authorized Landlord/Tenant/Admin)
const getRentReminderById = async (req, res) => {
  // Renamed from getReminderById to match convention
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const reminder = await RentReminder.findById(id);

    if (!reminder) {
      return sendErrorResponse(
        res,
        404,
        "Reminder Not Found",
        `Rent reminder with ID ${id} does not exist.`
      );
    }

    // Authorization: Tenant can see their own reminders, Landlord can see reminders for their houses/tenants, Admin sees all
    if (role === ROLE.TENANT && reminder.tenant_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to view this reminder."
      );
    }
    // For landlord, ensure the reminder belongs to a house they own
    if (role === ROLE.LANDLORD) {
      const house = await House.findById(reminder.house_id);
      if (!house || house.landlord_id !== userId) {
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "You are not authorized to view this reminder (not your house)."
        );
      }
    }
    // Admin always has access

    sendSuccessResponse(res, 200, "Rent reminder retrieved successfully.", {
      reminder,
    });
  } catch (error) {
    console.error("Error getting reminder by ID:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   PUT /api/reminders/:id
// @desc    Update a rent reminder
// @access  Private (Landlord or Admin)
const updateRentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const updates = req.body;

    const reminder = await RentReminder.findById(id);
    if (!reminder) {
      return sendErrorResponse(
        res,
        404,
        "Reminder Not Found",
        `Rent reminder with ID ${id} does not exist.`
      );
    }

    // Authorization: Only the landlord who owns the reminder (via house) or Admin can update
    const house = await House.findById(reminder.house_id); // Get house for landlord ownership check
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        "Associated house not found for reminder."
      );
    }

    const isLandlordAuthorized =
      role === ROLE.LANDLORD && house.landlord_id === userId;
    const isAdminAuthorized = role === ROLE.ADMIN;

    if (!isLandlordAuthorized && !isAdminAuthorized) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to update this reminder."
      );
    }

    // Basic validation for updates
    if (updates.type && !Object.values(REMINDER_TYPE).includes(updates.type)) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        `Invalid reminder type. Allowed: ${Object.values(REMINDER_TYPE).join(
          ", "
        )}`
      );
    }
    if (
      updates.reminder_date &&
      isNaN(new Date(updates.reminder_date).getTime())
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Invalid reminder_date format."
      );
    }
    if (updates.is_sent !== undefined && typeof updates.is_sent !== "boolean") {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "is_sent must be a boolean."
      );
    }
    if (updates.house_id) {
      const parsedHouseId = parseInt(updates.house_id);
      if (isNaN(parsedHouseId) || parsedHouseId <= 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "House ID must be a positive integer."
        );
      }
      // Ensure updated house also belongs to landlord/admin
      const updatedHouse = await House.findById(parsedHouseId);
      if (
        !updatedHouse ||
        (role === ROLE.LANDLORD && updatedHouse.landlord_id !== userId)
      ) {
        return sendErrorResponse(
          res,
          403,
          AuthenticationError.FORBIDDEN,
          "Cannot link reminder to a house you do not own."
        );
      }
    }
    if (updates.tenant_id) {
      const parsedTenantId = parseInt(updates.tenant_id);
      if (isNaN(parsedTenantId) || parsedTenantId <= 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "Tenant ID must be a positive integer."
        );
      }
      // Optional: Validate tenant is associated with the house (e.g., if house_id is also being updated)
      // This might require fetching the tenant and house details to cross-validate.
    }

    const updated = await RentReminder.update(id, updates);

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        "Update Failed",
        "Failed to update rent reminder."
      );
    }

    sendSuccessResponse(res, 200, "Rent reminder updated successfully.", {
      id,
    });
  } catch (error) {
    console.error("Error updating rent reminder:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   PUT /api/reminders/:id/mark-sent
// @desc    Mark a rent reminder as sent
// @access  Private (Landlord or Admin)
const markRentReminderAsSent = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const reminder = await RentReminder.findById(id);
    if (!reminder) {
      return sendErrorResponse(
        res,
        404,
        "Reminder Not Found",
        `Rent reminder with ID ${id} does not exist.`
      );
    }

    // Authorization: Only the landlord who owns the reminder (via house) or Admin can mark as sent
    const house = await House.findById(reminder.house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        "Associated house not found for reminder."
      );
    }

    const isLandlordAuthorized =
      role === ROLE.LANDLORD && house.landlord_id === userId;
    const isAdminAuthorized = role === ROLE.ADMIN;

    if (!isLandlordAuthorized && !isAdminAuthorized) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to mark this reminder as sent."
      );
    }

    if (reminder.is_sent) {
      return sendErrorResponse(
        res,
        400,
        "Invalid State",
        "Reminder is already marked as sent."
      );
    }

    const updated = await RentReminder.update(id, { is_sent: true });

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        "Update Failed",
        "Failed to mark rent reminder as sent."
      );
    }

    sendSuccessResponse(
      res,
      200,
      "Rent reminder marked as sent successfully.",
      { id, is_sent: true }
    );
  } catch (error) {
    console.error(
      "Error marking rent reminder as sent:",
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

// @route   DELETE /api/reminders/:id
// @desc    Delete a rent reminder
// @access  Private (Landlord or Admin)
const deleteRentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const reminder = await RentReminder.findById(id);
    if (!reminder) {
      return sendErrorResponse(
        res,
        404,
        "Reminder Not Found",
        `Rent reminder with ID ${id} does not exist.`
      );
    }

    // Authorization: Only the landlord who owns the reminder (via house) or Admin can delete
    const house = await House.findById(reminder.house_id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        "Associated house not found for reminder."
      );
    }

    const isLandlordAuthorized =
      role === ROLE.LANDLORD && house.landlord_id === userId;
    const isAdminAuthorized = role === ROLE.ADMIN;

    if (!isLandlordAuthorized && !isAdminAuthorized) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to delete this reminder."
      );
    }

    const deleted = await RentReminder.delete(id);

    if (!deleted) {
      return sendErrorResponse(
        res,
        400,
        "Delete Failed",
        "Failed to delete rent reminder."
      );
    }

    sendSuccessResponse(res, 200, "Rent reminder deleted successfully.", {
      id,
    });
  } catch (error) {
    console.error("Error deleting rent reminder:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

module.exports = {
  createRentReminder,
  getRentReminders, // This is the combined function
  getRentReminderById,
  updateRentReminder,
  markRentReminderAsSent, // Ensure this is exported
  deleteRentReminder,
};
