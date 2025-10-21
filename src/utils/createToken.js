const jwt = require("jsonwebtoken");

const createToken = (payload,exp) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: exp,
  });
};

module.exports = createToken;
