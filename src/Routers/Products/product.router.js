const express = require("express");
const upload = require("../../Middleware/multer.middleware");
const productRouter = express.Router();

const {createProduct,updateProduct,deleteProduct,getallProduct,detailProduct} = require("../../Controllers/Products/products.controller");

productRouter.post("/", upload, createProduct);
productRouter.put("/:id", upload, updateProduct);
productRouter.delete("/:id",deleteProduct);
productRouter.get("/all",getallProduct);
productRouter.get("/:id",detailProduct);

module.exports = productRouter;