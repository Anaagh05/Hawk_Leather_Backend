const express = require("express");
const userRouter = express.Router();
const {jwtVerification} = require("../../Middleware/auth.middleware")
const {registerUser,loginUser,forgetPassword,getReviews,getUser,updateUser,addReview,verifyPassword,resetPassword} = require("../../Controllers/UserAuth/user.controller");



userRouter.post("/register",registerUser);
userRouter.post("/login",loginUser);
userRouter.post("/forget",forgetPassword);
userRouter.post("/forget/verify",verifyPassword);
userRouter.post("/forget/reset",jwtVerification,resetPassword);
userRouter.put("/update",jwtVerification,updateUser);
userRouter.get("/user",jwtVerification,getUser);


userRouter.post("/review",jwtVerification,addReview);
userRouter.get("/review",getReviews);


module.exports = userRouter;