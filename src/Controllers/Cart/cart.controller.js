const User = require("../../Models/user.schema");
const Product = require("../../Models/products.schema");


// ============================================
// GET CART - Fetch user's cart with product details
// ============================================
const getCart = async (req, res) => {
  try {
    const userId = req.userId; // From JWT middleware

    // Find user and populate cart with product details
    const user = await User.findById(userId)
      .populate({
        path: "cart.productId",
        select: "itemName itemPrice itemImageUrl categoryName discount inStock",
      })
      .select("cart");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Filter out any cart items where product no longer exists (deleted products)
    const validCartItems = user.cart.filter((item) => item.productId !== null);

    // If cart changed (some products were deleted), update user's cart
    if (validCartItems.length !== user.cart.length) {
      user.cart = validCartItems;
      await user.save();
    }

    // Calculate cart summary
    let totalItems = 0;
    let subtotal = 0;

    validCartItems.forEach((item) => {
      if (item.productId) {
        totalItems += item.quantity;
        const discountedPrice =
          item.productId.itemPrice -
          (item.productId.itemPrice * item.productId.discount) / 100;
        subtotal += discountedPrice * item.quantity;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        cart: validCartItems,
        summary: {
          totalItems,
          subtotal: Math.round(subtotal),
          itemCount: validCartItems.length,
        },
      },
    });
  } catch (err) {
    console.error("Error in getCart:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


// ============================================
// ADD TO CART - Add product to cart or update quantity if already exists
// ============================================
const addCart = async (req, res) => {
  try {
    const userId = req.userId; // From JWT middleware
    const { id: productId } = req.params; // Product ID from URL
    const { quantity = 1 } = req.body; // Quantity from body (default 1)

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product is in stock
    if (!product.inStock) {
      return res.status(400).json({
        success: false,
        message: "Product is currently out of stock",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product already exists in cart
    const existingCartItemIndex = user.cart.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingCartItemIndex !== -1) {
      // Product already in cart - update quantity
      user.cart[existingCartItemIndex].quantity += Number(quantity);
      user.cart[existingCartItemIndex].addedAt = Date.now();
    } else {
      // Add new product to cart
      user.cart.push({
        productId: productId,
        quantity: Number(quantity),
        addedAt: Date.now(),
      });
    }

    await user.save();

    // Populate cart items for response
    await user.populate({
      path: "cart.productId",
      select: "itemName itemPrice itemImageUrl categoryName discount inStock",
    });

    return res.status(200).json({
      success: true,
      message:
        existingCartItemIndex !== -1
          ? "Cart updated successfully"
          : "Product added to cart successfully",
      data: {
        cart: user.cart,
      },
    });
  } catch (err) {
    console.error("Error in addCart:", err);

    // Handle invalid MongoDB ObjectId
    if (err.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


// ============================================
// UPDATE CART - Update quantity (increase/decrease) or remove if quantity becomes 0
// ============================================
const updateCart = async (req, res) => {
  try {
    const userId = req.userId; // From JWT middleware
    const { id: productId } = req.params; // Product ID from URL
    const { action, quantity } = req.body; // action: 'increase', 'decrease', 'set' | quantity: number

    // Validate action
    if (!action || !["increase", "decrease", "set"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'increase', 'decrease', or 'set'",
      });
    }

    // Validate quantity for 'set' action
    if (action === "set" && (!quantity || quantity < 0)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number for 'set' action",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find cart item
    const cartItemIndex = user.cart.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    // Update quantity based on action
    let newQuantity = user.cart[cartItemIndex].quantity;

    switch (action) {
      case "increase":
        newQuantity += 1;
        break;
      case "decrease":
        newQuantity -= 1;
        break;
      case "set":
        newQuantity = Number(quantity);
        break;
    }

    // If quantity becomes 0 or negative, remove item from cart
    if (newQuantity <= 0) {
      user.cart.splice(cartItemIndex, 1);
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Product removed from cart",
        data: {
          cart: user.cart,
          removed: true,
        },
      });
    }

    // Update quantity
    user.cart[cartItemIndex].quantity = newQuantity;
    await user.save();

    // Populate cart items for response
    await user.populate({
      path: "cart.productId",
      select: "itemName itemPrice itemImageUrl categoryName discount inStock",
    });

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: {
        cart: user.cart,
      },
    });
  } catch (err) {
    console.error("Error in updateCart:", err);

    // Handle invalid MongoDB ObjectId
    if (err.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


// ============================================
// DELETE FROM CART - Remove specific product from cart
// ============================================
const deleteCart = async (req, res) => {
  try {
    const userId = req.userId; // From JWT middleware
    const { id: productId } = req.params; // Product ID from URL

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find cart item index
    const cartItemIndex = user.cart.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    // Remove item from cart
    user.cart.splice(cartItemIndex, 1);
    await user.save();

    // Populate remaining cart items
    await user.populate({
      path: "cart.productId",
      select: "itemName itemPrice itemImageUrl categoryName discount inStock",
    });

    return res.status(200).json({
      success: true,
      message: "Product removed from cart successfully",
      data: {
        cart: user.cart,
      },
    });
  } catch (err) {
    console.error("Error in deleteCart:", err);

    // Handle invalid MongoDB ObjectId
    if (err.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

module.exports = {
  getCart,
  addCart,
  updateCart,
  deleteCart,
};
