const express = require("express");
const orderRouter = express.Router();
const jwtVerification = require("../../Middleware/auth.middleware");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  orderCancel,
  orderStatus,
  getAllOrders,
} = require("../../Controllers/Order/order.controller");

// Admin Order Routes:
orderRouter.put("/:orderId/status", orderStatus);
orderRouter.get("/all", getAllOrders);

// User Order Routes:
orderRouter.post("/create", jwtVerification, createOrder);
orderRouter.get("/myOrder", jwtVerification, getMyOrders);
orderRouter.get("/:orderId", jwtVerification, getOrderById);
orderRouter.put("/:orderId/cancel", jwtVerification, orderCancel);



module.exports = orderRouter;
