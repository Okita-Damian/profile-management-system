const AppError = require("../utils/appError");

// ========== DEV MODE ERROR ==========
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

// ========== PROD MODE ERROR ==========
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status || "error",
      message: err.message,
    });
  } else {
    console.error("💥 UNEXPECTED ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ========== GLOBAL ERROR HANDLER ==========
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    // Default
    let message = error.message;
    let statusCode = error.statusCode;

    // Invalid ObjectId
    if (err.name === "CastError") {
      message = `Invalid ${err.path}: ${err.value}`;
      statusCode = 400;
    }

    // Duplicate key error
    if (err.code === 11000) {
      const keyValue = err.keyValue || {};
      const field = Object.keys(keyValue)[0] || "field";
      const fieldValue = keyValue[field] || "unknown";
      message = `Duplicate value for '${field}': '${fieldValue}'. Please use a different value.`;
      statusCode = 400;
    }

    // Validation error
    if (err.name === "ValidationError") {
      const errors = err.errors || {};
      message = Object.values(errors)
        .map((val) => val.message)
        .join(", ");
      statusCode = 400;
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
      message = "Invalid token. Please log in again.";
      statusCode = 401;
    } else if (err.name === "TokenExpiredError") {
      message = "Your token has expired. Please log in again.";
      statusCode = 401;
    }

    // Multer file size
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size is too large. Maximum size is 5MB.";
      statusCode = 400;
    }

    // Assign updated message and status
    error.message = message;
    error.statusCode = statusCode;

    sendErrorProd(error, res);
  } else {
    sendErrorDev(err, res);
  }
};

module.exports = errorHandler;
