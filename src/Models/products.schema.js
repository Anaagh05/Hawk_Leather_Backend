// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: [true, 'Category name is required'],
    enum: ['Belts', 'Purses', 'Bags'],
    trim: true
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  itemPrice: {
    type: Number,
    required: [true, 'Item price is required'],
    min: [0, 'Price cannot be negative']
  },
  itemDescription: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  itemFeatures: {
    type: [String],
    default: [],
    validate: {
      validator: function(features) {
        return features.every(feature => feature.trim().length > 0);
      },
      message: 'Features cannot contain empty strings'
    }
  },
  itemImageUrl: {
    type: String,
    required: [true, 'Item image URL is required'],
    trim: true
  },
  itemImageCloudinaryId: {
    type: String,
    default: "",
    trim: true
  },
  inStock: {
    type: Boolean,
    default: true
  },
  discount:{
    type:Number,
    required:true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Create indexes for better query performance
productSchema.index({ categoryName: 1 });
productSchema.index({ itemName: 1 });
productSchema.index({ itemPrice: 1 });

// Virtual property to get formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `₹${this.itemPrice.toFixed(2)}`;
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;