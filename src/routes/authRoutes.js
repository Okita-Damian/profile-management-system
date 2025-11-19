const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const {
  registerSchema,
  loginSchema,
  otpSchema,
  resendOtpSchema,
  requestPasswordResetSchema,
  passwordResetSchema,
} = require("../validation/authValidation");
const authController = require("../controllers/authController");
const { authenticate, restrictTo } = require("../middlewares/auth");

// ==== Auth & OTP ROUTES ====
router.post("/register", validate(registerSchema), authController.register);
router.post("/verify-otp", validate(otpSchema), authController.verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), authController.resendOtp);

// occupants updated their own profile
router.put(
  "/update-user",
  authenticate,
  restrictTo("occupant"),
  authController.updateAuthUser
);

// Occupant gets their own profile
router.get(
  "/user",
  authenticate,
  restrictTo("occupant"),
  authController.getMyProfile
);

// ==== PASSWORD RESET ====
router.post(
  "/request-password-reset",
  validate(requestPasswordResetSchema),
  authController.requestPasswordReset
);
router.post(
  "/reset-password",
  validate(passwordResetSchema),
  authController.resetPassword
);

// === LOGIN / LOGOUT ====
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;
