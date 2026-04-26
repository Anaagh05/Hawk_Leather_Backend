const express = require("express");
const app = express();
const cors = require("cors");

//  CORS Handling:
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Important MiddleWare Configurations:
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Starts creating routes.

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server starts Serving.",
  });
});




// Importing Routers:

const productRouter = require("./Routers/Products/product.router");
const userRouter = require("./Routers/Users/user.router");
const userCart = require("./Routers/Cart/cart.router");
const orderRouter = require("./Routers/Orders/order.router");
const leatherRouter = require("./Routers/Leather/leather.router");
const descriptionRouter = require("./Routers/Landing_page_Description/description.router");
const locationRouter = require("./Routers/Landing_Page_Location/location.router");



// Using Routers:

app.use("/api/v1/products", productRouter);
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/cart", userCart);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/leather",leatherRouter);
app.use("/api/v1/description",descriptionRouter);
app.use("/api/v1/location",locationRouter);




module.exports = app;
