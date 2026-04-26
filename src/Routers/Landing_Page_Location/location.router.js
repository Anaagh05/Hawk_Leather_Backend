const express = require("express");
const locationRouter = express.Router();

const locationController = require("../../Controllers/Landing_Location/location.controller");

locationRouter.get("/", locationController.getLocation);
locationRouter.put("/", locationController.updateLocation);

module.exports = locationRouter;