const missionsService = require("./missions.service");

function sendResult(res, actionResult) {
  return res.status(actionResult.statusCode).json(actionResult.body);
}

exports.createMission = async (req, res) => {
  try {
    return sendResult(res, await missionsService.createMission(req.body));
  } catch (error) {
    console.error("createMission error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.updateMission = async (req, res) => {
  try {
    return sendResult(res, await missionsService.updateMission(req.body));
  } catch (error) {
    console.error("updateMission error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.deleteMission = async (req, res) => {
  try {
    return sendResult(res, await missionsService.deleteMission(req.body));
  } catch (error) {
    console.error("deleteMission error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.confirmMission = async (req, res) => {
  try {
    return sendResult(res, await missionsService.confirmMission(req.body));
  } catch (error) {
    console.error("confirmMission error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.completeMission = async (req, res) => {
  try {
    return sendResult(res, await missionsService.completeMission(req.body));
  } catch (error) {
    console.error("completeMission error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.cancelMission = async (req, res) => {
  try {
    return sendResult(res, await missionsService.cancelMission(req.body));
  } catch (error) {
    console.error("cancelMission error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.deleteCancelledMission = async (req, res) => {
  try {
    return sendResult(res, await missionsService.deleteCancelledMission(req.body));
  } catch (error) {
    console.error("deleteCancelledMission error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
