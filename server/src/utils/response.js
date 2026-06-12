/**
 * Standard API Response Wrapper
 * Provides consistent response format across all endpoints
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function success(res, data = null, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Optional success message
 */
function created(res, data = null, message = "Created successfully") {
  return success(res, data, message, 201);
}

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Optional error code
 * @param {*} details - Optional error details
 */
function error(res, message = "Internal Server Error", statusCode = 500, code = null, details = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (code) {
    response.code = code;
  }

  if (details && process.env.NODE_ENV !== "production") {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Bad Request response (400)
 */
function badRequest(res, message = "Bad Request", code = "BAD_REQUEST", details = null) {
  return error(res, message, 400, code, details);
}

/**
 * Unauthorized response (401)
 */
function unauthorized(res, message = "Unauthorized", code = "UNAUTHORIZED") {
  return error(res, message, 401, code);
}

/**
 * Forbidden response (403)
 */
function forbidden(res, message = "Forbidden", code = "FORBIDDEN") {
  return error(res, message, 403, code);
}

/**
 * Not Found response (404)
 */
function notFound(res, message = "Resource not found", code = "NOT_FOUND") {
  return error(res, message, 404, code);
}

/**
 * Validation Error response (422)
 */
function validationError(res, errors, message = "Validation failed") {
  return error(res, message, 422, "VALIDATION_ERROR", errors);
}

/**
 * Internal Server Error response (500)
 */
function serverError(res, message = "Internal Server Error", details = null) {
  return error(res, message, 500, "SERVER_ERROR", details);
}

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info { page, limit, total }
 * @param {string} message - Optional success message
 */
function paginated(res, data, pagination, message = "Success") {
  const { page = 1, limit = 10, total = 0 } = pagination;
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  success,
  created,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  serverError,
  paginated,
};
