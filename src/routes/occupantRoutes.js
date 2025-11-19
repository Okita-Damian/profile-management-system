const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const userController = require("../controllers/userController");
const validateMongoId = require("../utils/objectidValidator");
const { authenticate, restrictTo } = require("../middlewares/auth");

// ===== OCCUPANT ROUTES =====
// Route: Create a new user with profile photo and rent receipt upload
router.post(
  "/occupants",
  authenticate,
  restrictTo("occupant"),
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "rentReceipt", maxCount: 1 },
  ]),
  userController.createUser
);

// occupants get their own profile
router.get(
  "/me/occupants/",
  authenticate,
  restrictTo("occupant"),
  userController.getMyProfile
);

// Occupant updates their own profile
router.put(
  "/me/occupants",
  authenticate,
  restrictTo("occupant"),
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "rentReceipt", maxCount: 1 },
  ]),
  userController.updateMyProfile
);

// ===== ADMIN ROUTES =====
// Get all users
router.get(
  "/admin/occupants",
  authenticate,
  restrictTo("admin"),
  userController.getAllOccupants
);

// Get user by ID
router.get(
  "/admin/occupants/:id",
  authenticate,
  restrictTo("admin"),
  validateMongoId,
  userController.getUserById
);

router.put(
  "/admin/occupants/:id",
  authenticate,
  restrictTo("admin"),
  validateMongoId,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "rentReceipt", maxCount: 1 },
  ]),
  userController.updateUserById
);

router.delete(
  "/admin/occupants/:id",
  authenticate,
  restrictTo("admin"),
  validateMongoId,
  userController.deleteUser
);

module.exports = router;
