const userIdParamsSchema = {
  params: {
    userId: { required: true, type: "number" },
  },
};

const createUserSchema = {
  body: {
    username: { required: true, type: "string", minLength: 3, maxLength: 50 },
    password: { required: true, type: "string", minLength: 6, maxLength: 128 },
    locationCode: { type: "string", maxLength: 50 },
  },
};

const updateUserSchema = {
  params: {
    userId: { required: true, type: "number" },
  },
  body: {
    locationCode: { type: "string", maxLength: 50 },
  },
};

const resetPasswordSchema = {
  params: {
    userId: { required: true, type: "number" },
  },
  body: {
    password: { required: true, type: "string", minLength: 6, maxLength: 128 },
  },
};

module.exports = {
  userIdParamsSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
};
