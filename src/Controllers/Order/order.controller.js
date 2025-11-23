const User = require("../../Models/user.schema");
const Order = require("../../Models/order.schema");
const Product = require("../../Models/products.schema");
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



// ============================================
// CREATE RAZORPAY ORDER - Step 1 of online payment
// ============================================
const createRazorpayOrder = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware
        const { shippingAddress } = req.body;

        // Validate shipping address
        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
            !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.phone) {
            return res.status(400).json({
                success: false,
                message: "Complete shipping address is required"
            });
        }

        // Find user and populate cart
        const user = await User.findById(userId).populate('cart.productId');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if cart is empty
        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty. Add items before checkout"
            });
        }

        // Validate all products exist and are in stock
        let totalAmount = 0;

        for (let cartItem of user.cart) {
            if (!cartItem.productId) {
                return res.status(400).json({
                    success: false,
                    message: "Some products in cart no longer exist"
                });
            }

            const product = cartItem.productId;

            // Check if product is in stock
            if (!product.inStock) {
                return res.status(400).json({
                    success: false,
                    message: `Product "${product.itemName}" is out of stock`
                });
            }

            // Calculate price with discount
            const discountedPrice = product.itemPrice - (product.itemPrice * product.discount / 100);
            const itemTotal = discountedPrice * cartItem.quantity;
            totalAmount += itemTotal;
        }

        // Round total amount
        totalAmount = Math.round(totalAmount);

        // Create Razorpay order
        const razorpayOrder = await razorpayInstance.orders.create({
            amount: totalAmount * 100, // Amount in paise (multiply by 100)
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                shippingAddress: JSON.stringify(shippingAddress)
            }
        });

        return res.status(200).json({
            success: true,
            message: "Razorpay order created successfully",
            data: {
                orderId: razorpayOrder.id,
                amount: totalAmount,
                currency: "INR",
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });

    } catch (err) {
        console.error("Error in createRazorpayOrder:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order",
            error: err.message
        });
    }
};


// ============================================
// VERIFY RAZORPAY PAYMENT - Step 2 of online payment
// ============================================
const verifyRazorpayPayment = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            shippingAddress
        } = req.body;

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification details are required"
            });
        }

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed. Invalid signature"
            });
        }

        // Payment verified successfully - Now create order in database
        const user = await User.findById(userId).populate('cart.productId');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }

        // Prepare order items
        const orderItems = [];
        let totalAmount = 0;

        for (let cartItem of user.cart) {
            if (!cartItem.productId) {
                continue;
            }

            const product = cartItem.productId;
            const discountedPrice = product.itemPrice - (product.itemPrice * product.discount / 100);
            const itemTotal = discountedPrice * cartItem.quantity;

            orderItems.push({
                productId: product._id,
                itemName: product.itemName,
                itemPrice: Math.round(discountedPrice),
                quantity: cartItem.quantity
            });

            totalAmount += itemTotal;
        }

        // Create order with online payment details
        const newOrder = await Order.create({
            userId: user._id,
            items: orderItems,
            totalAmount: Math.round(totalAmount),
            orderStatus: 'processing',
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                pincode: shippingAddress.pincode,
                phone: shippingAddress.phone
            },
            paymentStatus: 'completed', // Payment already completed
            paymentMethod: 'online',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
        });

        // Add order to user's pending orders
        user.pendingOrders.push({
            orderId: newOrder._id,
            orderDate: newOrder.createdAt
        });

        // Clear user's cart
        user.cart = [];
        await user.save();

        // Populate order items for response
        await newOrder.populate('items.productId', 'itemName itemImageUrl categoryName');

        return res.status(201).json({
            success: true,
            message: "Payment verified and order placed successfully",
            data: newOrder
        });

    } catch (err) {
        console.error("Error in verifyRazorpayPayment:", err);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error: err.message
        });
    }
};


// ============================================
// CREATE ORDER - Convert cart to order (Checkout)
// ============================================
const createOrder = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware
        const { shippingAddress, paymentMethod = 'cod' } = req.body;

        // Validate shipping address
        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
            !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.phone) {
            return res.status(400).json({
                success: false,
                message: "Complete shipping address is required (street, city, state, pincode, phone)"
            });
        }

        // Validate payment method
        if (!['cod', 'online', 'card'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method. Must be: cod, online, or card"
            });
        }

        // Find user and populate cart
        const user = await User.findById(userId).populate('cart.productId');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if cart is empty
        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty. Add items before checkout"
            });
        }

        // Validate all products exist and are in stock
        const orderItems = [];
        let totalAmount = 0;

        for (let cartItem of user.cart) {
            if (!cartItem.productId) {
                return res.status(400).json({
                    success: false,
                    message: "Some products in cart no longer exist"
                });
            }

            const product = cartItem.productId;

            // Check if product is in stock
            if (!product.inStock) {
                return res.status(400).json({
                    success: false,
                    message: `Product "${product.itemName}" is out of stock`
                });
            }

            // Calculate price with discount
            const discountedPrice = product.itemPrice - (product.itemPrice * product.discount / 100);
            const itemTotal = discountedPrice * cartItem.quantity;

            orderItems.push({
                productId: product._id,
                itemName: product.itemName,
                itemPrice: Math.round(discountedPrice),
                quantity: cartItem.quantity
            });

            totalAmount += itemTotal;
        }

        // Create order with 'processing' status
        const newOrder = await Order.create({
            userId: user._id,
            items: orderItems,
            totalAmount: Math.round(totalAmount),
            orderStatus: 'processing',
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                pincode: shippingAddress.pincode,
                phone: shippingAddress.phone
            },
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'completed',
            paymentMethod: paymentMethod
        });

        // Add order to user's pending orders
        user.pendingOrders.push({
            orderId: newOrder._id,
            orderDate: newOrder.createdAt
        });

        // Clear user's cart
        user.cart = [];
        await user.save();

        // Populate order items for response
        await newOrder.populate('items.productId', 'itemName itemImageUrl categoryName');

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: newOrder
        });

    } catch (err) {
        console.error("Error in createOrder:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// GET MY ORDERS - Get user's orders with optional status filter
// ============================================
const getMyOrders = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware
        const { status } = req.query; // Optional: processing, shipped, delivered, cancelled

        // Build filter
        const filter = { userId: userId };

        // Add status filter if provided
        if (status) {
            if (!['processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status. Must be: processing, shipped, delivered, or cancelled"
                });
            }
            filter.orderStatus = status;
        }

        // Find all orders (no pagination)
        const orders = await Order.find(filter)
            .populate('items.productId', 'itemName itemImageUrl categoryName')
            .sort({ createdAt: -1 }); // Newest first

        // Separate orders by status for easy access
        const ordersSummary = {
            processing: orders.filter(o => o.orderStatus === 'processing').length,
            shipped: orders.filter(o => o.orderStatus === 'shipped').length,
            delivered: orders.filter(o => o.orderStatus === 'delivered').length,
            cancelled: orders.filter(o => o.orderStatus === 'cancelled').length
        };

        return res.status(200).json({
            success: true,
            data: {
                orders,
                summary: ordersSummary,
                totalOrders: orders.length
            }
        });

    } catch (err) {
        console.error("Error in getMyOrders:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// GET ORDER BY ID - Get specific order details
// ============================================
const getOrderById = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware
        const { orderId } = req.params;

        // Find order
        const order = await Order.findById(orderId)
            .populate('items.productId', 'itemName itemImageUrl categoryName itemPrice discount');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if order belongs to the user
        if (order.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: This order does not belong to you"
            });
        }

        return res.status(200).json({
            success: true,
            data: order
        });

    } catch (err) {
        console.error("Error in getOrderById:", err);
        
        // Handle invalid MongoDB ObjectId
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// CANCEL ORDER - User cancels their order
// ============================================
const orderCancel = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware
        const { orderId } = req.params;

        // Find order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if order belongs to the user
        if (order.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: This order does not belong to you"
            });
        }

        // Check if order can be cancelled (only processing orders)
        if (order.orderStatus !== 'processing') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel order with status: ${order.orderStatus}. Only processing orders can be cancelled`
            });
        }

        // Update order status to cancelled
        order.orderStatus = 'cancelled';
        await order.save();

        // Update user's order arrays (move from pending to completed)
        const user = await User.findById(userId);
        
        // Remove from pending orders
        user.pendingOrders = user.pendingOrders.filter(
            po => po.orderId.toString() !== orderId
        );

        // Add to completed orders (as cancelled)
        user.completedOrders.push({
            orderId: order._id,
            orderDate: order.createdAt,
            completedDate: Date.now()
        });

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: order
        });

    } catch (err) {
        console.error("Error in orderCancel:", err);
        
        // Handle invalid MongoDB ObjectId
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// UPDATE ORDER STATUS - Admin updates order status
// ============================================
const orderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Validate status
        if (!status || !['processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be: processing, shipped, delivered, or cancelled"
            });
        }

        // Find order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Prevent changing status of already delivered orders
        if (order.orderStatus === 'delivered' && status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: "Cannot change status of delivered order"
            });
        }

        // Update order status
        const oldStatus = order.orderStatus;
        order.orderStatus = status;

        // If status changed to delivered, update payment status for COD
        if (status === 'delivered' && order.paymentMethod === 'cod') {
            order.paymentStatus = 'completed';
        }

        await order.save();

        // If order is delivered, move from pending to completed orders
        if (status === 'delivered') {
            const user = await User.findById(order.userId);
            
            if (user) {
                // Remove from pending orders
                user.pendingOrders = user.pendingOrders.filter(
                    po => po.orderId.toString() !== orderId
                );

                // Add to completed orders
                user.completedOrders.push({
                    orderId: order._id,
                    orderDate: order.createdAt,
                    completedDate: Date.now()
                });

                await user.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: `Order status updated from ${oldStatus} to ${status}`,
            data: order
        });

    } catch (err) {
        console.error("Error in orderStatus:", err);
        
        // Handle invalid MongoDB ObjectId
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// GET ALL ORDERS - Admin gets all orders with optional status filter
// ============================================
const getAllOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        // Build filter
        const filter = {};

        // Add status filter if provided
        if (status) {
            if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status. Must be: pending, processing, shipped, delivered, or cancelled"
                });
            }
            filter.orderStatus = status;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Find orders with pagination
        const orders = await Order.find(filter)
            .populate('userId', 'userName userEmail phoneNumber')
            .populate('items.productId', 'itemName itemImageUrl categoryName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limitNum);

        // Get summary statistics
        const summary = {
            total: await Order.countDocuments(),
            pending: await Order.countDocuments({ orderStatus: 'pending' }),
            processing: await Order.countDocuments({ orderStatus: 'processing' }),
            shipped: await Order.countDocuments({ orderStatus: 'shipped' }),
            delivered: await Order.countDocuments({ orderStatus: 'delivered' }),
            cancelled: await Order.countDocuments({ orderStatus: 'cancelled' })
        };

        // Calculate total revenue (only delivered orders)
        const deliveredOrders = await Order.find({ orderStatus: 'delivered' });
        const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        return res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalOrders,
                    ordersPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                },
                summary,
                totalRevenue
            }
        });

    } catch (err) {
        console.error("Error in getAllOrders:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

module.exports = {
    createRazorpayOrder, 
    verifyRazorpayPayment,
    createOrder,
    getMyOrders,
    getOrderById,
    orderCancel,
    orderStatus,
    getAllOrders
};