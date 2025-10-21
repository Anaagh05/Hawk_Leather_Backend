const jwt = require("jsonwebtoken");
require("dotenv").config({
  path: "./.env",
});

const jwtVerification = async (req, res, next) => {
  // Firstly Extract the token from the request headers:
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({
      message: "Unauthorized",
      success: false,
    });

  // If token present then verify the token and send response accordingly:
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid Token or Expire Token",
    });
  }
};

module.exports = jwtVerification;
