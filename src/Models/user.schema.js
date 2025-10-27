// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
      minlength: [2, "Username must be at least 2 characters long"],
      maxlength: [50, "Username cannot exceed 50 characters"],
    },
    occupation: {
      type: String,
      required: [true, "User occupation is required"],
      trim: true,
      minlength: [2, "occupation must be at least 2 characters long"],
      maxlength: [50, "occupation cannot exceed 50 characters"],
    },
    pincode: {
      type: Number,
      required: [true, "Pincode is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    streetAddress: {
      type: String,
      required: [true, "Street Address is required"],
      trim: true,
    },
    phoneNumber: {
      type: Number,
      required: [true, "User phoneNumber is required"],
      trim: true,
      minlength: [10, "phoneNumber must be at least 10 characters long."],
      maxlength: [10, "phoneNumber cannot exceed 10 characters."],
    },
    userEmail: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    userHashPassword: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    cart: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: [1, "Quantity must be at least 1"],
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    pendingOrders: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        orderDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    completedOrders: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        orderDate: Date,
        completedDate: Date,
      },
    ],
    otp: {
      type: Number,
      default: 0,
    },
    expireOtp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to get cart item count
userSchema.virtual("cartItemCount").get(function () {
  return this.cart.reduce((total, item) => total + item.quantity, 0);
});

const User = mongoose.model("User", userSchema);

module.exports = User;
