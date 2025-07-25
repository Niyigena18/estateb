/**
 * Sends a consistent success response.
 * @param {Object} res - Express response object.
 * @param {number} statusCode - HTTP status code (e.g., 200, 201).
 * @param {string} message - A message describing the success.
 * @param {Object} data - Optional data payload to send with the response.
 */
exports.sendSuccessResponse = (res, statusCode, message, data = {}) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Sends a consistent error response.
 * @param {Object} res - Express response object.
 * @param {number} statusCode - HTTP status code (e.g., 400, 401, 500).
 * @param {string} message - A message describing the error.
 * @param {string|Object} errorDetails - Optional detailed error information (e.g., stack trace, validation errors).
 */
exports.sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: errorDetails,
  });
};
