function notFound(req, res) {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = statusCode >= 500 ? "Internal server error" : err.message;

  if (statusCode >= 500) {
    console.error("[ServerError]", err);
  }

  return res.status(statusCode).json({ message });
}

module.exports = {
  notFound,
  errorHandler,
};
