const loginSchema = {
  body: {
    username: { required: true, type: "string", minLength: 1, maxLength: 50 },
    password: { required: true, type: "string", minLength: 6, maxLength: 128 },
    platform: { required: false, type: "string", maxLength: 20 },
    deviceId: { required: false, type: "string", maxLength: 100 },
    firebaseToken: { required: false, type: "string", maxLength: 450 },
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

const deviceTokenSchema = {
  body: {
    deviceId: { required: true, type: "string", minLength: 1, maxLength: 100 },
    firebaseToken: { required: true, type: "string", minLength: 1, maxLength: 450 },
    platform: { required: false, type: "string", maxLength: 20 },
  },
};

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  deviceTokenSchema,
};
