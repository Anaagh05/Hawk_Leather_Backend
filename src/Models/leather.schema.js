// models/Product.js
const mongoose = require('mongoose');

const leatherSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  itemDescription: {
    type: String,
    required: [true, 'Item description is required.'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 2000 characters']
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
  itemCategory:{
    type:String,
    required: [true, 'Item category is required.'],
    trim:true
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
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});


const Leather = mongoose.model('Leather', leatherSchema);

module.exports = Leather;