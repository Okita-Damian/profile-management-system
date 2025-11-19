const Joi = require("joi");
const formatCase = require("../utils/formatCase");

function createCaseInsensitiveValidator(allowedMap, label) {
  const allowedValues = Object.values(allowedMap);

  return Joi.string()
    .trim()
    .min(1)
    .custom((value, helpers) => {
      const formatted = formatCase(value, allowedMap);

      if (formatted) return formatted;

      return helpers.error("any.invalid");
    })
    .messages({
      "any.invalid": `${label} must be one of: ${allowedValues.join(", ")}`,
      "any.required": `${label} is required`,
      "string.empty": `${label} is required`,
    });
}

module.exports = createCaseInsensitiveValidator;
