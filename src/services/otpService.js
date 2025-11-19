const bcrypt = require("bcryptjs");
const otpModel = require("../models/otpModel");
const generateOTP = require("../utils/generateOTP");
const AppError = require("../utils/appError");

class OTPService {
  /**
   * Create and save a new OTP
   */
  async createOTP(userId, purpose, expiryMinutes = 60) {
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(String(otp), 10);

    await otpModel.create({
      otp: hashedOTP,
      userId,
      purpose,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    return otp;
  }

  /**
   * Verify OTP
   */
  async verifyOTP(userId, otp, purpose) {
    const otpDetails = await otpModel.findOne({
      userId,
      purpose,
    });

    if (!otpDetails || otpDetails.expiresAt < Date.now()) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    const isMatch = await bcrypt.compare(String(otp), otpDetails.otp);
    if (!isMatch) {
      throw new AppError("Invalid OTP", 400);
    }

    return otpDetails;
  }

  async deleteOTP(otpId) {
    await otpModel.deleteOne({ _id: otpId });
  }

  async deleteUserOTPs(userId, purpose) {
    await otpModel.deleteMany({ userId, purpose });
  }

  async checkRateLimit(userId, purpose, waitSeconds = 30) {
    const existingOtp = await otpModel.findOne({ userId, purpose });

    if (existingOtp) {
      const now = Date.now();
      const createdAt = new Date(existingOtp.createdAt).getTime();
      const timeSinceLastOtp = (now - createdAt) / 1000;

      if (timeSinceLastOtp < waitSeconds) {
        throw new AppError(
          `Please wait ${Math.ceil(
            waitSeconds - timeSinceLastOtp
          )}s before requesting another OTP.`,
          429
        );
      }

      // Delete old OTP before creating new one
      await this.deleteOTP(existingOtp._id);
    }
  }
}

module.exports = new OTPService();
