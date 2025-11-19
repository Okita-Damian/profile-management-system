const Joi = require("joi");
const fs = require("fs");
const createCaseInsensitiveValidator = require("./customCaseValidator");
const statesAndLGAs = JSON.parse(fs.readFileSync("nigerian-states.json"));

const lowerCaseStatesMap = {};
const lowerCaseLGAMap = {};

for (const state of Object.keys(statesAndLGAs)) {
  lowerCaseStatesMap[state.toLocaleLowerCase()] = state;

  lowerCaseLGAMap[state.toLocaleLowerCase()] = {};
  for (const lga of statesAndLGAs[state]) {
    lowerCaseLGAMap[state.toLocaleLowerCase()][lga.toLocaleLowerCase()] = lga;
  }
}

// Helper: normalize state/LGA input
const normalizeStateLGA = (state, lga) => {
  const stateKey = state.trim().toLowerCase();
  const lgaKey = lga.trim().toLowerCase();

  const validState = Object.keys(statesAndLGAs).find(
    (s) => s.toLowerCase() === stateKey
  );
  if (!validState) throw new Error("State must be valid");

  const validLGA = statesAndLGAs[validState].find(
    (l) => l.toLowerCase() === lgaKey
  );
  if (!validLGA) throw new Error(`LGA must belong to state: ${validState}`);

  return { state: validState, LGA: validLGA };
};

// Schema
const userSchema = Joi.object({
  fullName: Joi.string().min(2).max(20).required().messages({
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name must not exceed 20 characters",
    "any.required": "Full name is required",
  }),
  phoneNumber: Joi.string()
    .pattern(/^\d{11}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be exactly 11 digits",
      "any.required": "Phone number is required",
    }),
  alternativePhoneNumber: Joi.string()
    .pattern(/^\d{11}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Alternative phone number must be exactly 11 digits",
    }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  homeAddress: Joi.string().min(5).max(100).required().messages({
    "string.min": "Home address must be at least 5 characters",
    "string.max": "Home address must not exceed 100 characters",
    "any.required": "Home address is required",
  }),

  roomNumber: Joi.string()
    .pattern(/^[A-Za-z0-9\-]+$/)
    .required()
    .messages({
      "string.pattern.base":
        "Room number can only contain letters, numbers, and dashes",
      "any.required": "Room number is required",
    }),
  gender: createCaseInsensitiveValidator(
    { male: "Male", female: "Female", other: "Other" },
    "Gender"
  ).required(),
  sponsor: createCaseInsensitiveValidator(
    { parent: "Parent", guardian: "Guardian", self: "Self" },
    "Sponsor"
  ).required(),
  occupation: createCaseInsensitiveValidator(
    {
      student: "Student",
      "non-student": "Non-student",
    },
    "occupation"
  ).required(),
  state: Joi.string()
    .required()
    .custom((value, helpers) => {
      const formatted = value.trim().toLowerCase();
      const properCase = lowerCaseStatesMap[formatted];
      if (!properCase) {
        return helpers.message("State must be a valid Nigerian state.");
      }
      return properCase;
    }),
  LGA: Joi.string()
    .required()
    .custom((value, helpers) => {
      const body = helpers.state.ancestors[0];
      const inputState = body.state?.toLowerCase();
      const inputLGA = value.trim().toLowerCase();

      const lgaMap = lowerCaseLGAMap[inputState];
      if (!lgaMap) {
        return helpers.message(
          "State is missing or invalid, so LGA can't be verified."
        );
      }

      const properCaseLGA = lgaMap[inputLGA];
      if (!properCaseLGA) {
        return helpers.message(
          `LGA must be valid for state: ${lowerCaseStatesMap[inputState]}`
        );
      }

      return properCaseLGA;
    }),

  //conditional requirement

  school: Joi.when("occupation", {
    is: "Student",
    then: Joi.string().required().messages({
      "any.required": "School is required for students",
    }),
    otherwise: Joi.string().optional(),
  }),

  faculty: Joi.when("occupation", {
    is: "Student",
    then: Joi.string().required().messages({
      "any.required": "Faculty is required for students",
    }),
    otherwise: Joi.string().optional(),
  }),

  companyName: Joi.when("occupation", {
    is: "Non-student",
    then: Joi.string().required().messages({
      "any.required": "Company name is required for non-students",
    }),
    otherwise: Joi.string().optional(),
  }),

  studentLevel: Joi.when("occupation", {
    is: "Student",
    then: Joi.string()
      .valid("100", "200", "300", "400", "500")
      .required()
      .messages({
        "any.only": "Student level must be one of 100, 200, 300, 400, 500",
        "any.required": "Student level is required for students",
      }),
    otherwise: Joi.forbidden(),
  }),
}).unknown(true);

// UpdateSchema
const updateUserSchema = Joi.object({
  fullName: Joi.string().min(2).max(20),

  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .lowercase()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  faculty: Joi.when("occupation", {
    is: "Student",
    then: Joi.string().required().messages({
      "any.required": "Faculty is required for students",
    }),
    otherwise: Joi.string().optional(),
  }),

  phoneNumber: Joi.string().pattern(/^\d{11}$/),

  alternativePhoneNumber: Joi.string()
    .pattern(/^\d{11}$/)
    .optional(),

  sponsor: createCaseInsensitiveValidator(
    { parent: "Parent", guardian: "Guardian", self: "Self" },
    "Sponsor"
  ),

  gender: createCaseInsensitiveValidator(
    { male: "Male", female: "Female", other: "Other" },
    "Gender"
  ),

  homeAddress: Joi.string().min(5).max(100).messages({
    "string.min": "Home address must be at least 5 characters",
    "string.max": "Home address must not exceed 100 characters",
    "any.required": "Home address is required",
  }),

  roomNumber: Joi.string()
    .pattern(/^[A-Za-z0-9\-]+$/)
    .messages({
      "string.pattern.base":
        "Room number can only contain letters, numbers, and dashes",
      "any.required": "Room number is required",
    }),
  occupation: createCaseInsensitiveValidator(
    { student: "Student", "non-student": "Non-student" },
    "Occupation"
  ),

  state: Joi.string().custom((value, helpers) => {
    const formatted = value.trim().toLowerCase();
    const properCase = lowerCaseStatesMap[formatted];
    if (!properCase) {
      return helpers.message("State must be a valid Nigerian state.");
    }
    return properCase;
  }),

  LGA: Joi.string().custom((value, helpers) => {
    const body = helpers.state.ancestors[0];
    const inputState = body.state?.toLowerCase();
    const inputLGA = value.trim().toLowerCase();

    const lgaMap = lowerCaseLGAMap[inputState];
    if (!lgaMap) {
      return helpers.message(
        "State is missing or invalid, so LGA can't be verified."
      );
    }

    const properCaseLGA = lgaMap[inputLGA];
    if (!properCaseLGA) {
      return helpers.message(
        `LGA must be valid for state: ${lowerCaseStatesMap[inputState]}`
      );
    }

    return properCaseLGA;
  }),
});

module.exports = { userSchema, updateUserSchema, normalizeStateLGA };
