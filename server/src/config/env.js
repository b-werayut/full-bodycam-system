function readString(name, defaultValue = "") {
  const value = process.env[name];
  return value === undefined || value === null || value === "" ? defaultValue : value;
}

function readInteger(name, defaultValue) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) ? value : defaultValue;
}

function readPositiveInteger(name, defaultValue) {
  const value = readInteger(name, defaultValue);
  return value > 0 ? value : defaultValue;
}

function readBoolean(name, defaultValue = false) {
  const value = process.env[name];

  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

module.exports = {
  readString,
  readInteger,
  readPositiveInteger,
  readBoolean,
};
