const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      lowercase: true,
    },

    faculty: {
      type: String,
      required: [true, "Faculty is required"],
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
    },
    studentLevel: {
      type: String,
      enum: ["100", "200", "300", "400", "500"],
    },
    alternativePhoneNumber: {
      type: String,
      unique: true,
    },
    homeAddress: {
      type: String,
      required: [true, "HomeAddress is required"],
    },

    LGA: {
      type: String,
      required: [true, "LGA is required"],
    },
    state: {
      type: String,
      required: [true, "state is required"],
    },
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
    },
    school: {
      type: String,
      required: [true, "School name is required"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },
    occupation: {
      type: String,
      enum: ["Student", "Non-student"],
      required: [true, "Occupation is required"],
    },
    sponsor: {
      type: String,
      enum: ["Parent", "Guardian", "Self"],
      required: [true, "Sponsor is required"],
    },

    profilePhoto: {
      type: String,
      required: [true, "Profile photo is required"],
    },

    rentReceipt: {
      type: String,
      required: [true, "Rent receipt is required"],
    },
    role: {
      type: String,
      enum: ["occupant"],
      default: "occupant",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ fullName: "text", roomNumber: "text" });

module.exports = mongoose.model("Occupant", userSchema);
