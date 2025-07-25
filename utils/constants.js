// utils/constants.js

module.exports = {
  ROLE: {
    // <-- UPDATED TO MATCH YOUR SCHEMA
    LANDLORD: "landlord", // Corresponds to your 'landlord' enum
    TENANT: "tenant", // Corresponds to your 'tenant' enum
    // Remove 'admin' and 'agent' if they are not in your ENUM
  },

  HOUSE_STATUS: {
    // <--- ADDED THIS BLOCK
    AVAILABLE: "available",
    RENTED: "rented",
  },
  PAYMENT_STATUS: {
    PENDING: "pending",
    PAID: "paid", // <--- Ensure this is present
    OVERDUE: "overdue", // <--- Ensure this is present
    // Add others like 'failed', 'refunded' if they are in your schema ENUM
  },

  RENT_REQUEST_STATUS: {
    PENDING: "pending",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    CANCELLED: "cancelled",
  },

  // Common Validation Error Messages
  ValidationError: {
    MISSING_CREDENTIALS: "Email and password are required.",
    INVALID_EMAIL: "Please provide a valid email address.",
    PASSWORD_TOO_SHORT: "Password must be at least 6 characters long.",
    INVALID_INPUT: "Invalid input provided.",
    EMAIL_ALREADY_EXISTS: "Email already registered.",
  },

  // Common Authentication Error Messages
  AuthenticationError: {
    INVALID_CREDENTIALS: "Invalid email or password.",
    USER_NOT_FOUND: "User not found.",
    UNAUTHORIZED: "Unauthorized access.",
    FORBIDDEN: "Access forbidden.",
    TOKEN_INVALID: "Invalid or expired token.",
    TOKEN_MISSING: "Authentication token missing.",
    USER_ALREADY_EXISTS: "User with this email already exists.",
  },

  // Common Server Error Messages
  ServerError: {
    INTERNAL_SERVER_ERROR: "An unexpected internal server error occurred.",
    DATABASE_ERROR: "Database operation failed.",
  },

  REMINDER_TYPE: {
    PAYMENT_DUE: "payment_due",
    PAYMENT_OVERDUE: "payment_overdue", // <--- ONLY THIS ONE
  },
  NotFoundError: {
    HOUSE_NOT_FOUND: "HOUSE_NOT_FOUND",
    TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
    LEASE_NOT_FOUND: "LEASE_NOT_FOUND",
  },
  ServerError: {
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
    OPERATION_FAILED: "OPERATION_FAILED",
  },
  ValidationError: {
    MISSING_FIELDS: "MISSING_FIELDS",
    INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
    // ... other validation errors
  },
  AuthorizationError: {
    NOT_AUTHORIZED: "NOT_AUTHORIZED",
    // Add other authorization specific messages if needed later, e.g.,
    // FORBIDDEN_RESOURCE: "FORBIDDEN_RESOURCE",
    // ROLE_INSUFFICIENT: "ROLE_INSUFFICIENT"
  },
  NotFoundError: {
    HOUSE_NOT_FOUND: "HOUSE_NOT_FOUND",
    TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
    LEASE_NOT_FOUND: "LEASE_NOT_FOUND",
    MAINTENANCE_REQUEST_NOT_FOUND: "MAINTENANCE_REQUEST_NOT_FOUND", // <--- ADD THIS
  },
};
