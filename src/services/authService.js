const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/authModel");
const AppError = require("../utils/appError");

class AuthService {
  async emailExists(email) {
    return await User.findOne({ email });
  }
  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return await User.create({
      fullName: userData.fullName,
      email: userData.email,
      password: hashedPassword,
      phoneNumber: userData.phoneNumber,
      gender: userData.gender,
      DOB: new Date(userData.DOB),
      role: userData.role?.toLowerCase() || "occupant",
    });
  }
  async verifyCredentials(email, password) {
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError("Incorrect email or password", 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError("Please verify your email first", 403);
    }

    return user;
  }
  generateTokens(user) {
    const accessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_KEY,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_KEY,
      { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
  }
  verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_KEY);
  }

  async updatePassword(user, newPassword) {
    // Check if new password is same as old
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      throw new AppError(
        "New password cannot be the same as the old password",
        400
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
  }

  async verifyUserEmail(userId) {
    await User.findByIdAndUpdate(userId, { isEmailVerified: true });
  }

  async saveRefreshToken(userId, refreshToken) {
    const user = await User.findById(userId);
    user.refreshToken = refreshToken;
    user.isLoggedIn = true;
    await user.save();
  }

  async clearRefreshToken(userId) {
    await User.findByIdAndUpdate(
      userId,
      { refreshToken: null },
      { runValidators: false }
    );
  }
}

module.exports = new AuthService();
