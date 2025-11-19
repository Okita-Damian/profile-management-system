const mongoose = require("mongoose");
const AppError = require("../utils/appError");

const validateMongoId = (req, res, next) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid ID format", 400));
  }
  next();
};
module.exports = validateMongoId;
