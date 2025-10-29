const Product = require("../../Models/products.schema");
const { uploadOnCloudinary, deleteFromCloudinary } = require("../../utils/cloudinary.util");

// ============================================
// CREATE PRODUCT
// ============================================
const createProduct = async (req, res) => {
    try {
        const { categoryName, itemName, itemPrice, itemDescription, itemFeatures, discount, gender } = req.body;

        // Validate required fields
        if (!categoryName || !itemName || !itemPrice || !itemDescription || !gender) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided (categoryName, itemName, itemPrice, itemDescription, gender)"
            });
        }
        // console.log("Category Name:",categoryName);
        // Validate category
        if (!['Belts', 'Purses', 'Bags'].includes(categoryName)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category. Must be one of: Belts, Purses, Bags"
            });
        }

        // Check if image file is uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Product image is required"
            });
        }

        // Upload image to Cloudinary from buffer
        const cloudinaryResponse = await uploadOnCloudinary(req.file, categoryName);

        if (!cloudinaryResponse) {
            return res.status(500).json({
                success: false,
                message: "Failed to upload image to Cloudinary"
            });
        }

        // Parse itemFeatures if it's a string
        let featuresArray = [];
        if (itemFeatures) {
            if (typeof itemFeatures === 'string') {
                try {
                    featuresArray = JSON.parse(itemFeatures);
                } catch (e) {
                    // If not JSON, split by comma
                    featuresArray = itemFeatures.split(',').map(f => f.trim()).filter(f => f.length > 0);
                }
            } else if (Array.isArray(itemFeatures)) {
                featuresArray = itemFeatures;
            }
        }

        let newgender = gender.toLowerCase();
        newgender = newgender.charAt(0).toUpperCase() + newgender.slice(1);

        // console.log("Gender: ",newgender);

        // Create new product
        const newProduct = await Product.create({
            categoryName,
            itemName,
            itemPrice: Number(itemPrice),
            itemDescription,
            itemFeatures: featuresArray,
            itemImageUrl: cloudinaryResponse.secure_url,
            itemImageCloudinaryId: cloudinaryResponse.public_id,
            discount: Number(discount) || 0,
            gender: newgender
        });

        // Remove sensitive fields from newProduct object before sending response
        const { itemImageCloudinaryId, createdAt, updatedAt, ...sanitizedProduct } = newProduct.toObject();
        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: sanitizedProduct
        });

    } catch (err) {
        console.error("Error in createProduct:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ============================================
// UPDATE PRODUCT
// ============================================
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName, itemName, itemPrice, itemDescription, itemFeatures, discount, gender } = req.body;

        // Find existing product
        const existingProduct = await Product.findById(id);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Prepare update object
        const updateData = {};

        if (categoryName) {
            if (!['Belts', 'Purses', 'Bags'].includes(categoryName)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category. Must be one of: Belts, Purses, Bags"
                });
            }
            updateData.categoryName = categoryName;
        }

        if (itemName) updateData.itemName = itemName;
        if (itemPrice) updateData.itemPrice = Number(itemPrice);
        if (itemDescription) updateData.itemDescription = itemDescription;
        if (discount !== undefined) updateData.discount = Number(discount);
        if (gender) {
            let newgender = gender.toLowerCase();
            newgender = newgender.charAt(0).toUpperCase() + newgender.slice(1);
            updateData.gender = newgender;
        }

        // Handle itemFeatures update
        if (itemFeatures) {
            if (typeof itemFeatures === 'string') {
                try {
                    updateData.itemFeatures = JSON.parse(itemFeatures);
                } catch (e) {
                    updateData.itemFeatures = itemFeatures.split(',').map(f => f.trim()).filter(f => f.length > 0);
                }
            } else if (Array.isArray(itemFeatures)) {
                updateData.itemFeatures = itemFeatures;
            }
        }

        // Handle image update if new image is uploaded
        if (req.file) {
            // Delete old image from Cloudinary
            if (existingProduct.itemImageCloudinaryId) {
                await deleteFromCloudinary(existingProduct.itemImageCloudinaryId);
            }

            // Upload new image from buffer
            const cloudinaryResponse = await uploadOnCloudinary(
                req.file,
                categoryName || existingProduct.categoryName
            );

            if (!cloudinaryResponse) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload new image to Cloudinary"
                });
            }

            updateData.itemImageUrl = cloudinaryResponse.secure_url;
            updateData.itemImageCloudinaryId = cloudinaryResponse.public_id;
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select("-itemImageCloudinaryId -createdAt -updatedAt");

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct
        });

    } catch (err) {
        console.error("Error in updateProduct:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ============================================
// DELETE PRODUCT
// ============================================
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Find product
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Delete image from Cloudinary
        if (product.itemImageCloudinaryId) {
            await deleteFromCloudinary(product.itemImageCloudinaryId);
        }

        // Delete product from database
        await Product.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (err) {
        console.error("Error in deleteProduct:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

// ============================================
// GET PRODUCT DETAILS BY ID
// ============================================
const detailProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Find product by ID
        const product = await Product.findById(id).select("-itemImageCloudinaryId -createdAt -updatedAt");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: product
        });

    } catch (err) {
        console.error("Error in detailProduct:", err);

        // Handle invalid MongoDB ObjectId
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID format"
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
// GET ALL PRODUCTS WITH CATEGORY FILTERS
// ============================================
const getallProduct = async (req, res) => {
    try {
        // Extract category query parameter
        const { category = 'none', gender = "none" } = req.query;

        // Build filter object
        const filter = {};

        // Category filter
        if (category !== 'none') {
            if (!['Belts', 'Purses', 'Bags'].includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category. Must be one of: Belts, Purses, Bags, or none"
                });
            }
            filter.categoryName = category;
        }

        if (gender !== 'none') {
            let newGender = gender.toLowerCase();
            newGender = newGender.charAt(0).toUpperCase() + newGender.slice(1);
            filter.gender = newGender;
        }

        // Get all products based on filter
        const products = await Product.find(filter).select("-itemImageCloudinaryId -createdAt -updatedAt").sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (err) {
        console.error("Error in getallProduct:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};

module.exports = {
    createProduct,
    updateProduct,
    deleteProduct,
    detailProduct,
    getallProduct
};