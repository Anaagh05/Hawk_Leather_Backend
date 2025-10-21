const express = require("express");
const cartRouter = express.Router();
const {jwtVerification} = require("../../Middleware/auth.middleware");
const {getCart, addCart, updateCart, deleteCart} = require("../../Controllers/Cart/cart.controller");   

cartRouter.get("/",jwtVerification,getCart);
cartRouter.post("/:id",jwtVerification,addCart);
cartRouter.put("/:id",jwtVerification,updateCart);
cartRouter.delete("/:id",jwtVerification,deleteCart);


module.exports = cartRouter;    