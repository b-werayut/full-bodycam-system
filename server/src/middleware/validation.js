function validateRequest(schema) {
  return (req, res, next) => {
    const errors = [];

    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body?.[field];

        if (rules.required && (value === undefined || value === null || value === "")) {
          errors.push(`${field} is required`);
          continue;
        }

        if (value !== undefined && value !== null) {
          if (rules.type === "string" && typeof value !== "string") {
            errors.push(`${field} must be a string`);
          }
          if (rules.type === "number" && typeof value !== "number") {
            errors.push(`${field} must be a number`);
          }
          if (rules.minLength && typeof value === "string" && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
          }
          if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
            errors.push(`${field} must be at most ${rules.maxLength} characters`);
          }
          if (rules.pattern && typeof value === "string" && !rules.pattern.test(value)) {
            errors.push(`${field} format is invalid`);
          }
        }
      }
    }

    if (schema.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params?.[field];

        if (rules.required && !value) {
          errors.push(`Parameter ${field} is required`);
        }
        if (rules.type === "number" && value && isNaN(Number(value))) {
          errors.push(`Parameter ${field} must be a number`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    return next();
  };
}

module.exports = { validateRequest };
