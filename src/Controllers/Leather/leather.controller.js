const Leather = require("../../Models/leather.schema");
const { uploadOnCloudinary, deleteFromCloudinary } = require("../../utils/cloudinary.util");

const leatherControllers = {

    // GET /all - Return all leather products
    getProducts: async (req, res) => {
        try {
            const products = await Leather.find({});

            if (!products || products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No leather products found.",
                });
            }

            const formattedProducts = products.map((product) => ({
                id: product._id,
                title: product.itemName,
                image: product.itemImageUrl,
                description: product.itemDescription,
                features: product.itemFeatures,
            }));

            return res.status(200).json({
                success: true,
                message: "Leather products fetched successfully.",
                data: formattedProducts,
            });
        } catch (err) {
            console.error("Error in getProducts:", err);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                error: err.message,
            });
        }
    },

    // POST / - Create a new leather product
    createProduct: async (req, res) => {
        try {
            const { title, description, features } = req.body;

            // Validate required text fields
            if (!title || !description) {
                return res.status(400).json({
                    success: false,
                    message: "Title and description are required.",
                });
            }

            // Validate image
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Product image is required.",
                });
            }

            // Parse features - form data sends arrays as comma-separated string or repeated fields
            // let parsedFeatures = [];
            // if (features) {
            //     if (Array.isArray(features)) {
            //         // multer already parsed repeated form fields into an array
            //         parsedFeatures = features.map((f) => f.trim()).filter((f) => f.length > 0);
            //     } else if (typeof features === "string") {
            //         // single string — could be comma-separated or JSON stringified array
            //         try {
            //             const parsed = JSON.parse(features);
            //             parsedFeatures = Array.isArray(parsed)
            //                 ? parsed.map((f) => f.trim()).filter((f) => f.length > 0)
            //                 : [features.trim()].filter((f) => f.length > 0);
            //         } catch {
            //             // plain comma-separated string
            //             parsedFeatures = features
            //                 .split(",")
            //                 .map((f) => f.trim())
            //                 .filter((f) => f.length > 0);
            //         }
            //     }
            // }

            // Parse itemFeatures if it's a string
            let parsedFeatures = [];
            console.log(parsedFeatures)
            console.log("features: ",features)
            console.log(typeof features)
            if (features) {
                if (typeof features === 'string') {
                    try {
                        parsedFeatures = JSON.parse(features);
                    } catch (e) {
                        // If not JSON, split by comma
                        parsedFeatures = features.split(',').map(f => f.trim()).filter(f => f.length > 0);
                    }
                } else if (Array.isArray(features)) {
                    parsedFeatures = features;
                }
            }

            // Upload image to Cloudinary under "Leather" category
            const cloudinaryResponse = await uploadOnCloudinary(req.file, "Leather");

            if (!cloudinaryResponse) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload image to Cloudinary. Please try again.",
                });
            }

            // Save product to DB
            const newProduct = await Leather.create({
                itemName: title.trim(),
                itemDescription: description.trim(),
                itemFeatures: parsedFeatures,
                itemImageUrl: cloudinaryResponse.secure_url,
                itemImageCloudinaryId: cloudinaryResponse.public_id,
            });

            return res.status(201).json({
                success: true,
                message: "Leather product created successfully.",
                data: {
                    id: newProduct._id,
                    title: newProduct.itemName,
                    image: newProduct.itemImageUrl,
                    description: newProduct.itemDescription,
                    features: newProduct.itemFeatures,
                },
            });
        } catch (err) {
            console.error("Error in createProduct:", err);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                error: err.message,
            });
        }
    },

    // PUT /:id - Update a leather product
    updateProduct: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if product exists
            const existingProduct = await Leather.findById(id);
            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: "Leather product not found.",
                });
            }

            const { title, description, features } = req.body;
            const updateData = {};

            // Update title if provided
            if (title && title.trim().length > 0) {
                updateData.itemName = title.trim();
            }

            // Update description if provided
            if (description && description.trim().length > 0) {
                updateData.itemDescription = description.trim();
            }

            // Update features if provided — overwrites all previous features
            if (features !== undefined && features !== null) {
                let parsedFeatures = [];
                if (Array.isArray(features)) {
                    parsedFeatures = features.map((f) => f.trim()).filter((f) => f.length > 0);
                } else if (typeof features === "string") {
                    try {
                        const parsed = JSON.parse(features);
                        parsedFeatures = Array.isArray(parsed)
                            ? parsed.map((f) => f.trim()).filter((f) => f.length > 0)
                            : [features.trim()].filter((f) => f.length > 0);
                    } catch {
                        parsedFeatures = features
                            .split(",")
                            .map((f) => f.trim())
                            .filter((f) => f.length > 0);
                    }
                }
                updateData.itemFeatures = parsedFeatures;
            }

            // Handle image update
            if (req.file) {
                // Delete old image from Cloudinary if it exists
                if (existingProduct.itemImageCloudinaryId) {
                    const deleteResponse = await deleteFromCloudinary(existingProduct.itemImageCloudinaryId);
                    if (!deleteResponse || deleteResponse.result !== "ok") {
                        console.warn("Warning: Failed to delete old image from Cloudinary:", existingProduct.itemImageCloudinaryId);
                        // Non-blocking — we still proceed with the update
                    }
                }

                // Upload new image to Cloudinary
                const cloudinaryResponse = await uploadOnCloudinary(req.file, "Leather");
                if (!cloudinaryResponse) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload new image to Cloudinary. Please try again.",
                    });
                }

                updateData.itemImageUrl = cloudinaryResponse.secure_url;
                updateData.itemImageCloudinaryId = cloudinaryResponse.public_id;
            }

            // If nothing to update
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No valid fields provided for update.",
                });
            }

            const updatedProduct = await Leather.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            return res.status(200).json({
                success: true,
                message: "Leather product updated successfully.",
                data: {
                    id: updatedProduct._id,
                    title: updatedProduct.itemName,
                    image: updatedProduct.itemImageUrl,
                    description: updatedProduct.itemDescription,
                    features: updatedProduct.itemFeatures,
                },
            });
        } catch (err) {
            console.error("Error in updateProduct:", err);
            // Handle invalid MongoDB ObjectId format
            if (err.name === "CastError") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID format.",
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                error: err.message,
            });
        }
    },

    // DELETE /:id - Delete a leather product
    deleteProduct: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if product exists
            const existingProduct = await Leather.findById(id);
            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: "Leather product not found.",
                });
            }

            // Delete image from Cloudinary if cloudinary ID exists
            if (existingProduct.itemImageCloudinaryId) {
                const deleteResponse = await deleteFromCloudinary(existingProduct.itemImageCloudinaryId);
                if (!deleteResponse || deleteResponse.result !== "ok") {
                    console.warn("Warning: Failed to delete image from Cloudinary:", existingProduct.itemImageCloudinaryId);
                    // Non-blocking — still proceed with DB deletion
                }
            }

            // Delete product from DB
            await Leather.findByIdAndDelete(id);

            return res.status(200).json({
                success: true,
                message: "Leather product deleted successfully.",
            });
        } catch (err) {
            console.error("Error in deleteProduct:", err);
            if (err.name === "CastError") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID format.",
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                error: err.message,
            });
        }
    },
};

module.exports = leatherControllers;