const express = require("express");
const upload = require("../../Middleware/multer.middleware");
const leatherRouter = express.Router();

const leatherControllers = require("../../Controllers/Leather/leather.controller");

leatherRouter.get("/all",leatherControllers.getProducts);
leatherRouter.post("/", upload, leatherControllers.createProduct);
leatherRouter.put("/:id", upload, leatherControllers.updateProduct);
leatherRouter.delete("/:id",leatherControllers.deleteProduct);
leatherRouter.get("/unique",leatherControllers.uniqueCategory);

module.exports = leatherRouter;