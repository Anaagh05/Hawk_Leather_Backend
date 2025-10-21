const app = require("./app");
const databaseConnecting = require("./Config/connection");
require("dotenv").config({
  path: "./.env",
});

const PORT = process.env.PORT || 3030;

databaseConnecting()
  .then((res) => {
    console.log("Database Connected Successfully.");
    app.listen(PORT, () => {
      console.log(`Server starts Serving on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error while connecting to Database.", err.message);
    process.exit(1);
  });
