const Joi = require("joi");

exports.registerSchema = Joi.object({
  fullName: Joi.string().required().trim().messages({
    "any.required": "Name is required",
    "string.empty": "Name cannot be empty",
  }),

  email: Joi.string().email().required().trim().messages({
    "any.required": "Email is required",
    "string.empty": "Email cannot be empty",
    "string.email": "Email must be valid",
  }),

  password: Joi.string()
    .pattern(new RegExp(/^[A-Za-z\d@$!%*?&]{8,}$/))
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters long and may include letters, numbers, and special characters",
      "any.required": "Password is required",
      "string.empty": "Password cannot be empty",
    }),

  confirmPassword: Joi.string().required().valid(Joi.ref("password")).messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
    "string.empty": "Confirm password cannot be empty",
  }),
  gender: Joi.string().valid("male", "female").required().messages({
    "any.required": "Gender is required",
    "string.empty": "Gender cannot be empty",
  }),
  DOB: Joi.string()
    .isoDate()
    .required()
    .custom((value, helpers) => {
      const date = new Date(value);
      if (date > new Date()) {
        return helpers.error("date.max");
      }
      return value;
    })
    .messages({
      "any.required": "Please confirm your date of birth",
      "string.isoDate": "Date of birth must be in YYYY-MM-DD format",
      "date.max": "Date of birth cannot be in the future",
    }),

  phoneNumber: Joi.string().pattern(/^\d{11}$/),

  role: Joi.string().valid("admin", "occupant").lowercase().optional(),
});

// ========== VERIFY OTP ==========
exports.otpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be valid",
    "any.required": "Email is required",
  }),
  otp: Joi.string().length(6).required().messages({
    "string.length": "OTP must be 6 digits",
    "any.required": "OTP is required",
  }),
});

exports.resendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  purpose: Joi.string().valid("verify-email", "reset-password").required(),
});

exports.requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.base": "Email must be a string",
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

// ========== RESET PASSWORD ==========
exports.passwordResetSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email must be valid",
    "any.required": "Email is required",
  }),
  otp: Joi.string().length(6).required().messages({
    "string.length": "OTP must be 6 digits",
    "any.required": "OTP is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters",
    "any.required": "New password is required",
  }),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.empty": "Email cannot be empty",
    "string.email": "Email must be valid",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty",
  }),
});
