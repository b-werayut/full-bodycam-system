const loginSchema = {
  body: {
    username: { required: true, type: "string", minLength: 1, maxLength: 50 },
    password: { required: true, type: "string", minLength: 6, maxLength: 128 },
  },
};

const registerSchema = {
  body: {
    username: { required: true, type: "string", minLength: 3, maxLength: 50 },
    password: { required: true, type: "string", minLength: 6, maxLength: 128 },
  },
};

const changePasswordSchema = {
  body: {
    currentPassword: { required: true, type: "string", minLength: 6, maxLength: 128 },
    newPassword: { required: true, type: "string", minLength: 6, maxLength: 128 },
  },
};

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
};
