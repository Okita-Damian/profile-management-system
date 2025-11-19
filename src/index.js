require("dotenv").config();
const express = require("express");
const AppError = require("./utils/appError");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");

//load routes
const occupantRoutes = require("./routes/occupantRoutes");
const authRoutes = require("./routes/authRoutes");

// Error middleware
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Middleware to increase timeout for all req
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
});

//server uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/", occupantRoutes);
app.use("/auth", authRoutes);

app.all("/*splat", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});
app.use(errorHandler);

module.exports = app;
