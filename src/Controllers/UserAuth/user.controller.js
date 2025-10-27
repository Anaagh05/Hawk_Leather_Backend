const User = require("../../Models/user.schema");
const Review = require("../../Models/reviews.schema");
const bcrypt = require("bcrypt");
const createToken = require("../../utils/createToken");
const Mail = require("../../utils/nodeMailer");


// ============================================
// REGISTER USER
// ============================================
const registerUser = async (req, res) => {
    try {
        const {
            userName,
            occupation,
            pincode,
            state,
            city,
            streetAddress,
            phoneNumber,
            userEmail,
            userPassword
        } = req.body;

        // Validate required fields
        if (!userName || !occupation || !pincode || !state || !city || !streetAddress || !phoneNumber || !userEmail || !userPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Validate phone number (10 digits)
        if (phoneNumber.toString().length !== 10) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits"
            });
        }

        // Validate password length
        if (userPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ userEmail: userEmail.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userPassword, 10);

        // Create new user
        const newUser = await User.create({
            userName,
            occupation,
            pincode: Number(pincode),
            state,
            city,
            streetAddress,
            phoneNumber: Number(phoneNumber),
            userEmail: userEmail.toLowerCase(),
            userHashPassword: hashedPassword,
            cart: [],
            pendingOrders: [],
            completedOrders: []
        });

        // Create JWT token (7 days expiry)
        const token = createToken({ id: newUser._id }, "7d");

        // Remove password from response
        const userResponse = newUser.toObject();
        delete userResponse.userHashPassword;
        delete userResponse.otp;
        delete userResponse.expireOtp;

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: userResponse,
                token
            }
        });

    } catch (err) {
        console.error("Error in registerUser:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// LOGIN USER
// ============================================
const loginUser = async (req, res) => {
    try {
        const { userEmail, userPassword } = req.body;

        // Validate required fields
        if (!userEmail || !userPassword) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user by email
        const user = await User.findOne({ userEmail: userEmail.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(userPassword, user.userHashPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Create JWT token (7 days expiry)
        const token = createToken({ id: user._id }, "7d");

        // Remove sensitive data from response
        const userResponse = user.toObject();
        delete userResponse.userHashPassword;
        delete userResponse.otp;
        delete userResponse.expireOtp;

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: {
                user: userResponse,
                token
            }
        });

    } catch (err) {
        console.error("Error in loginUser:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ============================================
// FORGET PASSWORD - STEP 1: Send OTP
// ============================================
const forgetPassword = async (req, res) => {
    try {
        const { userEmail } = req.body;

        // Validate email
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Find user
        const user = await User.findOne({ userEmail: userEmail.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user found with this email"
            });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Set OTP expiry (10 minutes from now)
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        // Save OTP to user
        user.otp = otp;
        user.expireOtp = otpExpiry;
        await user.save();

        // Send OTP via email
        const mailOptions = {
            from: process.env.Mailer_Email,
            to: user.userEmail,
            subject: "Password Reset OTP - Leather E-commerce",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello ${user.userName},</p>
                    <p>You requested to reset your password. Please use the following OTP to verify your identity:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: #666;">This OTP will expire in 10 minutes.</p>
                    <p style="color: #666;">If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">Leather E-commerce - Premium Leather Products</p>
                </div>
            `
        };

        const emailResponse = await Mail(mailOptions);

        if (!emailResponse) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email"
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your email",
            data: {
                email: user.userEmail,
                expiresIn: "10 minutes"
            }
        });

    } catch (err) {
        console.error("Error in forgetPassword:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// FORGET PASSWORD - STEP 2: Verify OTP
// ============================================
const verifyPassword = async (req, res) => {
    try {
        const { userEmail, otp } = req.body;

        // Validate inputs
        if (!userEmail || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        // Find user
        const user = await User.findOne({ userEmail: userEmail.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user found with this email"
            });
        }

        // Check if OTP exists
        if (!user.otp || user.otp === 0) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Please request a new one"
            });
        }

        // Check if OTP is expired
        if (new Date() > user.expireOtp) {
            // Clear expired OTP
            user.otp = 0;
            user.expireOtp = Date.now();
            await user.save();

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one"
            });
        }

        // Verify OTP
        if (Number(otp) !== user.otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // OTP verified - clear it and generate short-lived token (15 minutes)
        user.otp = 0;
        user.expireOtp = Date.now();
        await user.save();

        // Create short-lived token for password reset
        const resetToken = createToken({ id: user._id }, "15m");

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            data: {
                resetToken,
                expiresIn: "15 minutes"
            }
        });

    } catch (err) {
        console.error("Error in verifyPassword:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// FORGET PASSWORD - STEP 3: Reset Password
// ============================================
const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.userId; // From JWT middleware

        // Validate new password
        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password is required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        user.userHashPassword = hashedPassword;
        await user.save();

        // Send confirmation email
        const mailOptions = {
            from: process.env.Mailer_Email,
            to: user.userEmail,
            subject: "Password Changed Successfully - Leather E-commerce",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Changed Successfully</h2>
                    <p>Hello ${user.userName},</p>
                    <p>Your password has been changed successfully.</p>
                    <p style="color: #666;">If you didn't make this change, please contact us immediately.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">Leather E-commerce - Premium Leather Products</p>
                </div>
            `
        };

        await Mail(mailOptions);

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (err) {
        console.error("Error in resetPassword:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// GET USER DETAILS
// ============================================
const getUser = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware

        // Find user and populate cart, pending orders, and completed orders with lightweight details
        const user = await User.findById(userId)
            .populate({
                path: 'cart.productId',
                select: 'itemName itemPrice itemImageUrl categoryName discount inStock'
            })
            .populate({
                path: 'pendingOrders.orderId',
                select: 'totalAmount orderStatus paymentStatus createdAt items',
                populate: {
                    path: 'items.productId',
                    select: 'itemName itemImageUrl'
                }
            })
            .populate({
                path: 'completedOrders.orderId',
                select: 'totalAmount orderStatus paymentStatus createdAt updatedAt items',
                populate: {
                    path: 'items.productId',
                    select: 'itemName itemImageUrl'
                }
            })
            .select('-userHashPassword -otp -expireOtp');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (err) {
        console.error("Error in getUser:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};


// ============================================
// UPDATE USER DETAILS
// ============================================
const updateUser = async (req, res) => {
    try {
        const userId = req.userId; // From JWT middleware
        const {
            userName,
            occupation,
            pincode,
            state,
            city,
            streetAddress,
            phoneNumber
        } = req.body;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Update fields if provided
        const updateData = {};

        if (userName) updateData.userName = userName;
        if (occupation) updateData.occupation = occupation;
        if (pincode) {
            updateData.pincode = Number(pincode);
        }
        if (state) updateData.state = state;
        if (city) updateData.city = city;
        if (streetAddress) updateData.streetAddress = streetAddress;
        if (phoneNumber) {
            if (phoneNumber.toString().length !== 10) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number must be exactly 10 digits"
                });
            }
            updateData.phoneNumber = Number(phoneNumber);
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-userHashPassword -otp -expireOtp');

        return res.status(200).json({
            success: true,
            message: "User details updated successfully",
            data: updatedUser
        });

    } catch (err) {
        console.error("Error in updateUser:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ============================================
// ADD REVIEW 
// ============================================
const addReview = async (req, res)=>{
    try{
        // 1. Extract the userId from the request:
        const userId = req.userId;

        // 2. Verify userId:
        const user = await User.findById(userId).select("userName occupation createdAt _id");

        if (!user){
            return res.status(404).json({
                message: "User not found"
            })
        }

        // 3. Extracting the rating and commnets:
        const {rating,comment} = req.body;

        if (!rating || !comment){
            return res.status(400).json({
                message: "Please provide rating and comment"
            })
        }

        // 4. Add review:
        const review = new Review({
            userId: userId,
            rating: rating,
            comment: comment
        })

        const newReview = await review.save();

        if (!newReview){
            return res.status(500).json({
                message: "Internal server error while publising the review."
            })
        }

        return res.status(200).json({
            message: "Review added successfully",
            review: newReview
        })
    }
    catch(err){
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

// ============================================
// GET ALL REVIEW
// ============================================
const getReviews = async (req, res)=>{
    try{
        // 1. Fetching all the user reviews:
        const allReviews = await Review.find().populate({
            path: 'userId',
            select: 'userName occupation'
        })
        
        // 2. Just send the resposne:
        return res.status(200).json({
            message: "Reviews fetched successfully",
            reviews: allReviews
        })
    }
    catch(err){
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}


module.exports = {
    registerUser,
    loginUser,
    forgetPassword,
    getUser,
    updateUser,
    addReview,
    getReviews,
    verifyPassword,
    resetPassword
}