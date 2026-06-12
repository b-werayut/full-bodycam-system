const { dssLogin } = require("./dss.service");
const { getPlayback } = require("./playback.controller");
const { searchRecordings } = require("./recordings.controller");
const { getStream } = require("./stream.controller");

module.exports = {
  dssLogin,
  getPlayback,
  getStream,
  searchRecordings,
};
