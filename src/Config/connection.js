const mongoose = require("mongoose");
require("dotenv").config({
  path: "./.env",
});

const databaseConnecting = async () => {
  try {
    const res = await mongoose.connect(process.env.DATABASE_URL);
    return res;
  } catch (error) {
    return error;
  }
};

module.exports = databaseConnecting;
