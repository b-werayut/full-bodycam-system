const crypto = require("crypto");
const { promisify } = require("util");
const { config } = require("../../config");

const pbkdf2Async = promisify(crypto.pbkdf2);

async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = parseInt(parts[1], 10);
    const salt = Buffer.from(parts[2], "base64");
    const storedKey = parts[3];

    const derivedKey = await pbkdf2Async(
      password,
      salt,
      iterations,
      config.auth.passwordKeyLength,
      config.auth.passwordDigest,
    );

    return derivedKey.toString("base64") === storedKey;
  } catch {
    return false;
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await pbkdf2Async(
    password,
    salt,
    config.auth.passwordIterations,
    config.auth.passwordKeyLength,
    config.auth.passwordDigest,
  );

  return `pbkdf2$${config.auth.passwordIterations}$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

module.exports = {
  verifyPassword,
  hashPassword,
};
