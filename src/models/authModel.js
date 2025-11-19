const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      required: [true, "phoneNumber is required"],
      unique: true,
      match: /^\d{11}$/,
    },
    gender: {
      type: String,
      required: [true, "gender is required"],
      enum: ["male", "female"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    DOB: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    role: {
      type: String,
      enum: ["occupant", "admin"],
      default: "occupant",
    },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("user", schema);
