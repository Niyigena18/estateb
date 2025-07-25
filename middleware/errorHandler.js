const { sendErrorResponse } = require("../utils/helpers");
const { ServerError } = require("../utils/constants");

const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging

  let statusCode = err.statusCode || 500;
  let message = err.message || ServerError.INTERNAL_SERVER_ERROR;
  let errorDetails = err.name || "Error";

  // Handle specific types of errors if necessary
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
    errorDetails = "JsonWebTokenError";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired. Please log in again.";
    errorDetails = "TokenExpiredError";
  } else if (err.name === "CastError") {
    // For MongoDB, but useful for general bad IDs
    statusCode = 400;
    message = `Resource not found with ID of ${err.value}`;
    errorDetails = "CastError";
  }
  // Add more custom error handling based on your application's needs

  sendErrorResponse(res, statusCode, message, errorDetails);
};

module.exports = errorHandler;
