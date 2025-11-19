const { registerSchema, loginSchema } = require("../validation/authValidation");
const User = require("../models/authModel");
const AppError = require("../utils/appError");
const asyncHandler = require("../middlewares/asyncHandler");

// Services
const authService = require("../services/authService");
const otpService = require("../services/otpService");
const emailService = require("../services/emailService");

// ========== REGISTER ==========
exports.register = asyncHandler(async (req, res, next) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  if (value.password.length < 8) {
    return next(new AppError("Password must be at least 8 characters", 400));
  }

  const emailExists = await authService.emailExists(value.email);
  if (emailExists) return next(new AppError("Email already exists", 409));

  const newUser = await authService.createUser(value);
  const otp = await otpService.createOTP(newUser._id, "verify-email", 60);
  try {
    await emailService.sendVerificationEmail(value.email, otp);
  } catch (emailError) {
    console.error("Failed to send verification email:", emailError);
  }
  res.status(201).json({
    status: "success",
    message:
      "Registration successful. Please check your email for OTP verification.",
  });
});

// ========== GET MY PROFILE ==========
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({
    status: "success",
    data: user,
  });
});

// ========== UPDATE AUTH USER ONLY ==========
exports.updateAuthUser = asyncHandler(async (req, res, next) => {
  const { fullName, gender } = req.body;

  if (!fullName && !gender) {
    return next(
      new AppError("Please provide at least one field to update", 400)
    );
  }

  const updates = {};
  if (fullName) updates.fullName = fullName;
  if (gender) updates.gender = gender;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "User information updated successfully",
    data: updatedUser,
  });
});

// ========== VERIFY OTP ==========
exports.verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Email and OTP are required", 400));
  }

  // Sanitize OTP input
  const sanitizedOtp = otp.toString().trim();
  if (!/^\d{6}$/.test(sanitizedOtp)) {
    return next(new AppError("Invalid OTP format", 400));
  }

  const user = await User.findOne({ email });
  if (!user) return next(new AppError("User not found", 404));

  const otpDetails = await otpService.verifyOTP(user._id, otp, [
    "verify-email",
    "reset-password",
  ]);

  await authService.verifyUserEmail(user._id);
  await otpService.deleteOTP(otpDetails._id);

  res.json({
    status: "success",
    message:
      otpDetails.purpose === "verify-email"
        ? "Email verified successfully."
        : "OTP verified. You may now reset your password.",
  });
});

// ========== RESEND OTP ==========
exports.resendOtp = asyncHandler(async (req, res, next) => {
  const { email, purpose } = req.body;

  if (!email || !purpose) {
    return next(new AppError("Email and purpose are required", 400));
  }

  const normalizedPurpose = purpose.toLowerCase();
  if (!["verify-email", "reset-password"].includes(normalizedPurpose)) {
    return next(new AppError("Invalid OTP purpose", 400));
  }

  const user = await User.findOne({ email });
  if (!user) return next(new AppError("User not found", 404));

  if (normalizedPurpose === "verify-email" && user.isEmailVerified) {
    return next(new AppError("Email is already verified", 400));
  }

  await otpService.checkRateLimit(user._id, normalizedPurpose, 30);

  await otpService.deleteUserOTPs(user._id, normalizedPurpose);

  const otp = await otpService.createOTP(user._id, normalizedPurpose, 60);

  await emailService.sendResendOTPEmail(email, otp);

  res.status(200).json({
    status: "success",
    message: "OTP sent to email successfully.",
  });
});

// ========== REQUEST PASSWORD RESET ==========
exports.requestPasswordReset = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError("Email is required", 400));

  const user = await User.findOne({ email });
  if (!user) {
    // Return success even if user doesn't exist (security best practice)
    return res.status(200).json({
      status: "success",
      message:
        "If an account with that email exists, a password reset OTP has been sent.",
    });
  }

  await otpService.deleteUserOTPs(user._id, "reset-password");
  const otp = await otpService.createOTP(user._id, "reset-password", 60);
  await emailService.sendPasswordResetEmail(email, otp);

  res.status(200).json({
    status: "success",
    message:
      "If an account with that email exists, a password reset OTP has been sent.",
  });
});

// ========== RESET PASSWORD ==========
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  // Check required fields first
  if (!email || !otp || !newPassword) {
    return next(new AppError("Email, OTP, and new password are required", 400));
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return next(new AppError("Password must be at least 8 characters", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new AppError("User not found", 404));

  const otpDetails = await otpService.verifyOTP(
    user._id,
    otp,
    "reset-password"
  );
  await authService.updatePassword(user, newPassword);
  await otpService.deleteOTP(otpDetails._id);
  await emailService.sendPasswordResetSuccessEmail(email, user.fullName);

  res.status(200).json({
    status: "success",
    message: "Password reset successfully.",
  });
});

// ========== LOGIN ==========
exports.login = asyncHandler(async (req, res, next) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const user = await authService.verifyCredentials(value.email, value.password);
  const { accessToken, refreshToken } = authService.generateTokens(user);

  await authService.saveRefreshToken(user._id, refreshToken);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.status(200).json({
    status: "success",
    message: "Login successful",
    token: accessToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
});

// ========== REFRESH TOKEN ==========
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return next(new AppError("No refresh token provided", 401));
  }

  const decoded = authService.verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.userId);

  if (!user) return next(new AppError("User not found", 401));
  if (user.refreshToken !== refreshToken) {
    return next(new AppError("Invalid refresh token", 401));
  }

  // Rotate refresh token for better security
  const { accessToken, refreshToken: newRefreshToken } =
    authService.generateTokens(user);
  await authService.saveRefreshToken(user._id, newRefreshToken);

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.status(200).json({
    status: "success",
    token: accessToken,
  });
});

// ========== LOGOUT ==========
exports.logout = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    try {
      const decoded = authService.verifyRefreshToken(refreshToken);
      await authService.clearRefreshToken(decoded.userId);
    } catch (err) {
      // Token invalid or expired, proceed with logout anyway
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});
