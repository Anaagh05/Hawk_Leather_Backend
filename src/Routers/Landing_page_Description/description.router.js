const express = require("express");
const descriptionRouter = express.Router();

const descriptionController = require("../../Controllers/Landing_Description/description.controller");

descriptionRouter.get("/", descriptionController.getDescription);
descriptionRouter.put("/", descriptionController.updateDescription);

module.exports = descriptionRouter; 