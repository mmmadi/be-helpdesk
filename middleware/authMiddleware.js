const jwt = require("jsonwebtoken");
const config = require("../config/config.json");

const authMiddleware = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1]; //"Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ message: "Нет авторизации" });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Нет авторизации" });
  }
};

module.exports = authMiddleware;
