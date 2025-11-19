const Occupant = require("../models/occupantModel");
const AppError = require("../utils/appError");
const cloudinary = require("../config/cloudinary");
const asyncHandler = require("../middlewares/asyncHandler");
const fs = require("fs").promises;
const {
  userSchema,
  updateUserSchema,
  normalizeStateLGA,
} = require("../validation/occupantValidation");

// Helper function to extract Cloudinary public ID from URL
const getCloudinaryPublicId = (url) => {
  try {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    return `${folder}/${filename.split(".")[0]}`;
  } catch (error) {
    console.error("Error extracting Cloudinary public ID:", error);
    return null;
  }
};

// Helper function to delete Cloudinary image
const deleteCloudinaryImage = async (url) => {
  try {
    const publicId = getCloudinaryPublicId(url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted Cloudinary image: ${publicId}`);
    }
  } catch (error) {
    console.error("Error deleting Cloudinary image:", error);
  }
};

// Helper function to clean up local files
const cleanupLocalFiles = async (files) => {
  const cleanupPromises = files
    .filter(Boolean)
    .map((file) =>
      fs
        .unlink(file)
        .catch((err) => console.error(`Failed to delete ${file}:`, err))
    );
  await Promise.all(cleanupPromises);
};

// Helper function to validate file types
const validateFileType = (file, allowedTypes) => {
  if (!file) return true;
  const fileType = file.mimetype;
  return allowedTypes.some((type) => fileType.startsWith(type));
};

// ========== CREATE USER ==========
exports.createUser = asyncHandler(async (req, res, next) => {
  // Check authentication first before any processing
  if (!req.user || !req.user.id)
    return next(new AppError("User must be authenticated", 401));

  const { error, value } = userSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  value.userId = req.user.id;

  const profilePhotoPath = req.files?.profilePhoto?.[0]?.path;
  const rentReceiptPath = req.files?.rentReceipt?.[0]?.path;

  if (!profilePhotoPath || !rentReceiptPath) {
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);
    return next(
      new AppError("Both profile photo and rent receipt are required", 400)
    );
  }

  // Validate file types
  const profilePhoto = req.files.profilePhoto[0];
  const rentReceipt = req.files.rentReceipt[0];

  if (!validateFileType(profilePhoto, ["image/"])) {
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);
    return next(new AppError("Profile photo must be an image file", 400));
  }

  if (!validateFileType(rentReceipt, ["image/", "application/pdf"])) {
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);
    return next(new AppError("Rent receipt must be an image or PDF file", 400));
  }

  // Validate file sizes (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (profilePhoto.size > maxSize || rentReceipt.size > maxSize) {
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);
    return next(new AppError("File size must not exceed 5MB", 400));
  }

  // Check for duplicate email or full name BEFORE uploading
  const existingUser = await Occupant.findOne({
    $or: [
      { email: value.email.toLowerCase() },
      { fullName: value.fullName.toLowerCase() },
    ],
  });

  if (existingUser) {
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);
    return next(
      new AppError("User with this name or email already exists", 400)
    );
  }

  // Check if occupant already exists for this user
  const existingOccupant = await Occupant.findOne({ userId: req.user.id });
  if (existingOccupant) {
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);
    return next(
      new AppError("Occupant profile already exists for this user", 400)
    );
  }

  let uploadedProfile, uploadedReceipt;

  try {
    // Upload to Cloudinary
    uploadedProfile = await cloudinary.uploader.upload(profilePhotoPath, {
      folder: "users/profile_photos",
      timeout: 60000,
      resource_type: "auto",
    });

    uploadedReceipt = await cloudinary.uploader.upload(rentReceiptPath, {
      folder: "users/rent_receipts",
      timeout: 60000,
      resource_type: "auto",
    });

    // Delete local temp files after successful upload
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);

    value.profilePhoto = uploadedProfile.secure_url;
    value.rentReceipt = uploadedReceipt.secure_url;

    const newUser = await Occupant.create(value);

    console.log(`New occupant created: ${newUser._id}`);

    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    // Clean up local files
    await cleanupLocalFiles([profilePhotoPath, rentReceiptPath]);

    // Clean up Cloudinary uploads if they succeeded
    if (uploadedProfile) {
      await deleteCloudinaryImage(uploadedProfile.secure_url);
    }
    if (uploadedReceipt) {
      await deleteCloudinaryImage(uploadedReceipt.secure_url);
    }

    console.error("Error creating occupant:", error);
    return next(new AppError("Failed to create user: " + error.message, 500));
  }
});

// ========= GET MY PROFILE ======
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.id)
    return next(new AppError("User must be authenticated", 401));

  const occupant = await Occupant.findOne({ userId: req.user.id });

  if (!occupant) return next(new AppError("Occupant not found ", 404));

  res.status(200).json({
    status: "success",
    message: "Occupant profile retrieved successfully",
    data: occupant,
  });
});

// ========== UPDATE MY PROFILE ==========
exports.updateMyProfile = asyncHandler(async (req, res, next) => {
  // Parse JSON fields if they exist (for multipart form data)
  let bodyData = { ...req.body };
  if (req.body.data) {
    try {
      bodyData = JSON.parse(req.body.data);
    } catch (e) {
      await cleanupLocalFiles([
        req.files?.profilePhoto?.[0]?.path,
        req.files?.rentReceipt?.[0]?.path,
      ]);
      return next(new AppError("Invalid JSON data", 400));
    }
  }

  // Validate against schema
  const { error, value } = updateUserSchema.validate(bodyData);
  if (error) {
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);
    return next(new AppError(error.details[0].message, 400));
  }

  const restrictedFields = [
    "email",
    "role",
    "password",
    "confirmPassword",
    "phoneNumber",
    "userId",
  ];
  const attemptedRestricted = restrictedFields.filter(
    (field) => field in bodyData
  );

  if (attemptedRestricted.length > 0) {
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);
    return next(
      new AppError(
        `You are not allowed to update the following fields: ${attemptedRestricted.join(
          ", "
        )}`,
        403
      )
    );
  }

  const updates = { ...value };

  // Get current occupant data to delete old Cloudinary files
  const currentOccupant = await Occupant.findOne({ userId: req.user.id });
  if (!currentOccupant) {
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);
    return next(new AppError("Occupant profile not found", 404));
  }

  try {
    // Handle profile photo update
    if (req.files?.profilePhoto) {
      const profilePhoto = req.files.profilePhoto[0];

      // Validate file type and size
      if (!validateFileType(profilePhoto, ["image/"])) {
        throw new Error("Profile photo must be an image file");
      }
      if (profilePhoto.size > 5 * 1024 * 1024) {
        throw new Error("Profile photo size must not exceed 5MB");
      }

      const uploadedProfile = await cloudinary.uploader.upload(
        profilePhoto.path,
        {
          folder: "users/profile_photos",
          timeout: 60000,
          resource_type: "auto",
        }
      );

      // Delete old profile photo from Cloudinary
      if (currentOccupant.profilePhoto) {
        await deleteCloudinaryImage(currentOccupant.profilePhoto);
      }

      updates.profilePhoto = uploadedProfile.secure_url;
      await fs.unlink(profilePhoto.path);
    }

    // Handle rent receipt update
    if (req.files?.rentReceipt) {
      const rentReceipt = req.files.rentReceipt[0];

      // Validate file type and size
      if (!validateFileType(rentReceipt, ["image/", "application/pdf"])) {
        throw new Error("Rent receipt must be an image or PDF file");
      }
      if (rentReceipt.size > 5 * 1024 * 1024) {
        throw new Error("Rent receipt size must not exceed 5MB");
      }

      const uploadedReceipt = await cloudinary.uploader.upload(
        rentReceipt.path,
        {
          folder: "users/rent_receipts",
          timeout: 60000,
          resource_type: "auto",
        }
      );

      // Delete old rent receipt from Cloudinary
      if (currentOccupant.rentReceipt) {
        await deleteCloudinaryImage(currentOccupant.rentReceipt);
      }

      updates.rentReceipt = uploadedReceipt.secure_url;
      await fs.unlink(rentReceipt.path);
    }
  } catch (uploadError) {
    // Clean up local files
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);

    console.error("File upload error:", uploadError);
    return next(
      new AppError("File upload failed: " + uploadError.message, 500)
    );
  }

  // Handle state and LGA normalization
  if (updates.state && updates.LGA) {
    try {
      const normalized = normalizeStateLGA(updates.state, updates.LGA);
      updates.state = normalized.state;
      updates.LGA = normalized.LGA;
    } catch (e) {
      return next(new AppError(e.message, 400));
    }
  } else if (updates.state || updates.LGA) {
    return next(
      new AppError("Both state and LGA must be provided together", 400)
    );
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError("No fields to update", 400));
  }

  const updatedOccupant = await Occupant.findOneAndUpdate(
    { userId: req.user.id },
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedOccupant) {
    return next(new AppError("Occupant profile not found", 404));
  }

  console.log(`Occupant updated: ${updatedOccupant._id}`);

  res.status(200).json({
    status: "success",
    message: "Occupant profile updated successfully",
    data: updatedOccupant,
  });
});

// ====== ADMINS ONLY   ========

//GET ALL OCCUPANTS
exports.getAllOccupants = asyncHandler(async (req, res) => {
  const {
    gender,
    roomNumber,
    search,
    sortBy = "createdAt",
    order = "desc",
    page = 1,
    limit = 10,
  } = req.query;

  // Validate sortBy field to prevent injection
  const allowedSortFields = [
    "fullName",
    "roomNumber",
    "gender",
    "createdAt",
    "updatedAt",
  ];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  // Validate order
  const validOrder = ["asc", "desc"].includes(order.toLowerCase())
    ? order.toLowerCase()
    : "desc";

  const filter = {};
  if (gender) {
    const validGenders = ["male", "female", "other"];
    if (validGenders.includes(gender.toLowerCase())) {
      filter.gender = gender.toLowerCase();
    }
  }

  if (roomNumber) filter.roomNumber = roomNumber;

  if (search) {
    // Use regex search instead of text search (more flexible)
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const sortOption = { [validSortBy]: validOrder === "asc" ? 1 : -1 };

  // Validate and sanitize pagination
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10)); // Max 100 items per page
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    Occupant.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(), // Use lean() for better performance
    Occupant.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: users.length,
    total,
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    data: users,
  });
});

// ========== GET USER BY ID ==========
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await Occupant.findById(req.params.id);

  // Validate MongoDB ObjectId
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError("Invalid user ID format", 400));
  }

  if (!user) return next(new AppError("Occupant not found", 404));
  res.status(200).json({
    status: "success",
    data: user,
  });
});

// ========== UPDATE USER BY ID ==========
exports.updateUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);
    return next(new AppError("Invalid user ID format", 400));
  }

  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);
    return next(new AppError(error.details[0].message, 400));
  }

  const user = await Occupant.findById(id);
  if (!user) {
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);
    return next(new AppError("Occupant not found", 404));
  }

  const updateData = { ...value };

  try {
    // Handle profile photo update
    if (req.files?.profilePhoto) {
      const profilePhoto = req.files.profilePhoto[0];

      if (!validateFileType(profilePhoto, ["image/"])) {
        throw new Error("Profile photo must be an image file");
      }
      if (profilePhoto.size > 5 * 1024 * 1024) {
        throw new Error("Profile photo size must not exceed 5MB");
      }

      const uploadedProfile = await cloudinary.uploader.upload(
        profilePhoto.path,
        {
          folder: "users/profile_photos",
          timeout: 60000,
          resource_type: "auto",
        }
      );

      // Delete old profile photo
      if (user.profilePhoto) {
        await deleteCloudinaryImage(user.profilePhoto);
      }

      updateData.profilePhoto = uploadedProfile.secure_url;
      await fs.unlink(profilePhoto.path);
    }

    // Handle rent receipt update
    if (req.files?.rentReceipt) {
      const rentReceipt = req.files.rentReceipt[0];

      if (!validateFileType(rentReceipt, ["image/", "application/pdf"])) {
        throw new Error("Rent receipt must be an image or PDF file");
      }
      if (rentReceipt.size > 5 * 1024 * 1024) {
        throw new Error("Rent receipt size must not exceed 5MB");
      }

      const uploadedReceipt = await cloudinary.uploader.upload(
        rentReceipt.path,
        { folder: "users/rent_receipts", timeout: 60000, resource_type: "auto" }
      );

      // Delete old rent receipt
      if (user.rentReceipt) {
        await deleteCloudinaryImage(user.rentReceipt);
      }

      updateData.rentReceipt = uploadedReceipt.secure_url;
      await fs.unlink(rentReceipt.path);
    }
  } catch (uploadError) {
    await cleanupLocalFiles([
      req.files?.profilePhoto?.[0]?.path,
      req.files?.rentReceipt?.[0]?.path,
    ]);

    console.error("File upload error:", uploadError);
    return next(
      new AppError("File upload failed: " + uploadError.message, 500)
    );
  }

  const updatedUser = await Occupant.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  console.log(`Occupant updated by admin: ${updatedUser._id}`);

  res.status(200).json({
    status: "success",
    message: "User updated successfully",
    data: updatedUser,
  });
});

// ========== DELETE USER ==========
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError("Invalid user ID format", 400));
  }

  const user = await Occupant.findById(id);
  if (!user) return next(new AppError("User not found", 404));

  // Delete associated Cloudinary files
  if (user.profilePhoto) {
    await deleteCloudinaryImage(user.profilePhoto);
  }
  if (user.rentReceipt) {
    await deleteCloudinaryImage(user.rentReceipt);
  }

  await Occupant.findByIdAndDelete(id);

  console.log(`Occupant deleted: ${id}`);

  res.status(200).json({
    status: "success",
    message: "User deleted successfully",
  });
});
