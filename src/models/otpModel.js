const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    otp: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "occpant",
      required: true,
    },
    purpose: {
      type: String,
      enum: ["verify-email", "reset-password"],
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => Date.now() + 60 * 60 * 1000,
      expires: 0,
    },
  },
  { timestamps: true }
);

const otpModel = mongoose.model("otp", schema);

module.exports = otpModel;
