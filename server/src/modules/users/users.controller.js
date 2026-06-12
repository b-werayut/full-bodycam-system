const usersService = require("./users.service");
const { isUniqueUsernameError } = require("./users.repository");

function sendResult(res, result) {
  return res.status(result.statusCode).json(result.body);
}

function sendDuplicateUsername(res) {
  return res.status(409).json({ message: "Username already exists" });
}

exports.listRoles = async (req, res) => {
  try {
    return sendResult(res, await usersService.listRoles());
  } catch (error) {
    console.error("listRoles error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.listUsers = async (req, res) => {
  try {
    return sendResult(res, await usersService.listUsers());
  } catch (error) {
    console.error("listUsers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    return sendResult(res, await usersService.getUserById(req.params.userId));
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    return sendResult(res, await usersService.getUserDetails(req.params.userId));
  } catch (error) {
    console.error("getUserDetails error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.createUser = async (req, res) => {
  try {
    return sendResult(res, await usersService.createUser(req.body));
  } catch (error) {
    console.error("createUser error:", error);
    if (isUniqueUsernameError(error)) {
      return sendDuplicateUsername(res);
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    return sendResult(res, await usersService.updateUser(req.params.userId, req.body, req.user));
  } catch (error) {
    console.error("updateUser error:", error);
    if (isUniqueUsernameError(error)) {
      return sendDuplicateUsername(res);
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    return sendResult(res, await usersService.resetUserPassword(req.params.userId, req.body));
  } catch (error) {
    console.error("resetUserPassword error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    return sendResult(res, await usersService.deleteUser(req.params.userId));
  } catch (error) {
    console.error("deleteUser error:", error);

    if (error && typeof error === "object" && error.code === "P2003") {
      return res.status(409).json({ message: "Cannot delete user due to related records" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};
