// controllers/houseController.js
const House = require("../models/House");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers");
const {
  ROLE,
  HOUSE_STATUS,
  AuthenticationError,
  ServerError,
  ValidationError,
} = require("../utils/constants");

// @route   POST /api/houses
// @desc    Create a new house listing
// @access  Private (Landlord only)
const createHouse = async (req, res) => {
  try {
    const { id: landlord_id, role } = req.user; // Get landlord_id from authenticated user

    if (role !== ROLE.LANDLORD) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Only landlords can create house listings."
      );
    }

    const {
      title,
      description,
      address,
      rent_amount,
      bedrooms,
      bathrooms,
      image_url,
      rental_start_date,
    } = req.body;

    // Basic validation for required fields
    if (
      !title ||
      !description ||
      !address ||
      !rent_amount ||
      !bedrooms ||
      !bathrooms
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.MISSING_REQUIRED_FIELDS,
        "Title, description, address, rent amount, bedrooms, and bathrooms are required."
      );
    }

    // Validate numeric fields
    if (isNaN(parseFloat(rent_amount)) || parseFloat(rent_amount) <= 0) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Rent amount must be a positive number."
      );
    }
    if (isNaN(parseInt(bedrooms)) || parseInt(bedrooms) < 0) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Bedrooms must be a non-negative integer."
      );
    }
    if (isNaN(parseInt(bathrooms)) || parseInt(bathrooms) < 0) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Bathrooms must be a non-negative integer."
      );
    }

    // Validate optional date format if provided
    if (rental_start_date && isNaN(new Date(rental_start_date).getTime())) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Invalid rental_start_date format. Please use a valid date string (e.g., YYYY-MM-DD or ISO 8601)."
      );
    }

    const houseId = await House.create({
      landlord_id,
      title,
      description,
      address,
      rent_amount,
      bedrooms,
      bathrooms,
      image_url, // Now explicitly passed
      rental_start_date, // Now explicitly passed
    });

    sendSuccessResponse(res, 201, "House listing created successfully.", {
      houseId,
    });
  } catch (error) {
    console.error("Error creating house listing:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   GET /api/houses
// @desc    Get all house listings (public or tenant view)
// @access  Public (or Private for filtering options if needed)
const getHouses = async (req, res) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Parse filter parameters
    const { status, minRent, maxRent, bedrooms, bathrooms, is_active } =
      req.query;

    // Validation for query parameters
    const filterOptions = {};
    if (status) {
      if (!Object.values(HOUSE_STATUS).includes(status)) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          `Invalid status provided. Allowed values: ${Object.values(
            HOUSE_STATUS
          ).join(", ")}`
        );
      }
      filterOptions.status = status;
    }
    if (minRent !== undefined) {
      const parsedMinRent = parseFloat(minRent);
      if (isNaN(parsedMinRent) || parsedMinRent < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "minRent must be a non-negative number."
        );
      }
      filterOptions.minRent = parsedMinRent;
    }
    if (maxRent !== undefined) {
      const parsedMaxRent = parseFloat(maxRent);
      if (isNaN(parsedMaxRent) || parsedMaxRent < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "maxRent must be a non-negative number."
        );
      }
      filterOptions.maxRent = parsedMaxRent;
    }
    if (bedrooms !== undefined) {
      const parsedBedrooms = parseInt(bedrooms);
      if (isNaN(parsedBedrooms) || parsedBedrooms < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "bedrooms must be a non-negative integer."
        );
      }
      filterOptions.bedrooms = parsedBedrooms;
    }
    if (bathrooms !== undefined) {
      const parsedBathrooms = parseInt(bathrooms);
      if (isNaN(parsedBathrooms) || parsedBathrooms < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "bathrooms must be a non-negative integer."
        );
      }
      filterOptions.bathrooms = parsedBathrooms;
    }
    if (is_active !== undefined) {
      if (is_active !== "true" && is_active !== "false") {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          'is_active must be "true" or "false".'
        );
      }
      filterOptions.is_active = is_active === "true";
    }

    const { houses, total } = await House.findAll({
      limit,
      offset,
      ...filterOptions,
    });

    sendSuccessResponse(res, 200, "House listings retrieved successfully.", {
      houses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting house listings:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   GET /api/houses/landlord
// @desc    Get house listings for the authenticated landlord
// @access  Private (Landlord only)
const getLandlordHouses = async (req, res) => {
  try {
    const { id: landlordId, role } = req.user;

    if (role !== ROLE.LANDLORD) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "Only landlords can view their own house listings."
      );
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Parse filter parameters
    const { status, minRent, maxRent, bedrooms, bathrooms, is_active } =
      req.query;

    // Validation for query parameters (similar to getHouses)
    const filterOptions = {};
    if (status) {
      if (!Object.values(HOUSE_STATUS).includes(status)) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          `Invalid status provided. Allowed values: ${Object.values(
            HOUSE_STATUS
          ).join(", ")}`
        );
      }
      filterOptions.status = status;
    }
    if (minRent !== undefined) {
      const parsedMinRent = parseFloat(minRent);
      if (isNaN(parsedMinRent) || parsedMinRent < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "minRent must be a non-negative number."
        );
      }
      filterOptions.minRent = parsedMinRent;
    }
    if (maxRent !== undefined) {
      const parsedMaxRent = parseFloat(maxRent);
      if (isNaN(parsedMaxRent) || parsedMaxRent < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "maxRent must be a non-negative number."
        );
      }
      filterOptions.maxRent = parsedMaxRent;
    }
    if (bedrooms !== undefined) {
      const parsedBedrooms = parseInt(bedrooms);
      if (isNaN(parsedBedrooms) || parsedBedrooms < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "bedrooms must be a non-negative integer."
        );
      }
      filterOptions.bedrooms = parsedBedrooms;
    }
    if (bathrooms !== undefined) {
      const parsedBathrooms = parseInt(bathrooms);
      if (isNaN(parsedBathrooms) || parsedBathrooms < 0) {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "bathrooms must be a non-negative integer."
        );
      }
      filterOptions.bathrooms = parsedBathrooms;
    }
    if (is_active !== undefined) {
      if (is_active !== "true" && is_active !== "false") {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          'is_active must be "true" or "false".'
        );
      }
      filterOptions.is_active = is_active === "true";
    }

    const { houses, total } = await House.findByLandlordId(landlordId, {
      limit,
      offset,
      ...filterOptions,
    });

    sendSuccessResponse(
      res,
      200,
      "Your house listings retrieved successfully.",
      {
        houses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    );
  } catch (error) {
    console.error(
      "Error getting landlord house listings:",
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

// @route   GET /api/houses/:id
// @desc    Get a single house listing by ID
// @access  Public
const getHouseById = async (req, res) => {
  try {
    const { id } = req.params;
    const house = await House.findById(id);

    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        `House with ID ${id} does not exist.`
      );
    }

    sendSuccessResponse(res, 200, "House listing retrieved successfully.", {
      house,
    });
  } catch (error) {
    console.error("Error getting house by ID:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   PUT /api/houses/:id
// @desc    Update a house listing
// @access  Private (Landlord only, for their own houses)
const updateHouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user; // Authenticated user ID and role
    const updates = req.body;

    const house = await House.findById(id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        `House with ID ${id} does not exist.`
      );
    }

    // Authorization: Only the landlord who owns the house can update it
    if (role !== ROLE.LANDLORD || house.landlord_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to update this house listing."
      );
    }

    // Validate incoming updates
    if (
      updates.rent_amount !== undefined &&
      (isNaN(parseFloat(updates.rent_amount)) ||
        parseFloat(updates.rent_amount) <= 0)
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Rent amount must be a positive number."
      );
    }
    if (
      updates.bedrooms !== undefined &&
      (isNaN(parseInt(updates.bedrooms)) || parseInt(updates.bedrooms) < 0)
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Bedrooms must be a non-negative integer."
      );
    }
    if (
      updates.bathrooms !== undefined &&
      (isNaN(parseInt(updates.bathrooms)) || parseInt(updates.bathrooms) < 0)
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Bathrooms must be a non-negative integer."
      );
    }
    if (
      updates.status &&
      !Object.values(HOUSE_STATUS).includes(updates.status)
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        `Invalid status provided. Allowed values: ${Object.values(
          HOUSE_STATUS
        ).join(", ")}`
      );
    }
    if (updates.is_active !== undefined) {
      if (typeof updates.is_active !== "boolean") {
        return sendErrorResponse(
          res,
          400,
          ValidationError.INVALID_INPUT,
          "is_active must be a boolean (true or false)."
        );
      }
    }
    // Validate optional date format if provided
    if (
      updates.rental_start_date &&
      isNaN(new Date(updates.rental_start_date).getTime())
    ) {
      return sendErrorResponse(
        res,
        400,
        ValidationError.INVALID_INPUT,
        "Invalid rental_start_date format. Please use a valid date string (e.g., YYYY-MM-DD or ISO 8601)."
      );
    }

    // Prevent tenant_id from being directly updated here, it should be managed via rent requests
    delete updates.tenant_id;

    const updated = await House.update(id, updates);

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        "Update Failed",
        "Failed to update house listing. No valid fields provided or record not found."
      );
    }

    sendSuccessResponse(res, 200, "House listing updated successfully.", {
      id,
      ...updates,
    });
  } catch (error) {
    console.error("Error updating house listing:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

// @route   DELETE /api/houses/:id
// @desc    Delete a house listing
// @access  Private (Landlord only, for their own houses)
const deleteHouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user; // Authenticated user ID and role

    const house = await House.findById(id);
    if (!house) {
      return sendErrorResponse(
        res,
        404,
        "House Not Found",
        `House with ID ${id} does not exist.`
      );
    }

    // Authorization: Only the landlord who owns the house can delete it
    if (role !== ROLE.LANDLORD || house.landlord_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthenticationError.FORBIDDEN,
        "You are not authorized to delete this house listing."
      );
    }

    const deleted = await House.delete(id);

    if (!deleted) {
      return sendErrorResponse(
        res,
        400,
        "Delete Failed",
        "Failed to delete house listing."
      );
    }

    sendSuccessResponse(res, 200, "House listing deleted successfully.", {
      id,
    });
  } catch (error) {
    console.error("Error deleting house listing:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

module.exports = {
  createHouse,
  getHouses,
  getLandlordHouses,
  getHouseById,
  updateHouse,
  deleteHouse,
};
