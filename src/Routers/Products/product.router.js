const express = require("express");
const upload = require("../../Middleware/multer.middleware");
const productRouter = express.Router();

const {createProduct,updateProduct,deleteProduct,getallProduct,detailProduct} = require("../../Controllers/Products/products.controller");

productRouter.post("/",upload.single("itemImageUrl"),createProduct);
productRouter.put("/:id",upload.single("itemImageUrl"),updateProduct);
productRouter.delete("/:id",deleteProduct);
productRouter.get("/all",getallProduct);
productRouter.get("/:id",detailProduct);

module.exports = productRouter;