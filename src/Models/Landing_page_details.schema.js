const mongoose = require("mongoose");

const landingPageDetailsSchema = new mongoose.Schema({
    upperDescription: {
        type: String,
        trim: true,
        maxlength: [250, "Upper description cannot exceed 50 characters"]
    },
    lowerDescription: {
        type: String,
        trim: true,
        maxlength: [500, "Lower description cannot exceed 500 characters"]
    },
    location: {
        type: String,
        trim: true,
        maxlength: [30, "Location cannot exceed 100 characters"]
    },
    phoneNumber: {
        type: String,        // change from Number to String
        trim: true,
        maxlength: [10, "Phone number cannot exceed 10 characters"]
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    }
},{timestamps:true})

const LandingPageDetails = mongoose.model("LandingPageDetails", landingPageDetailsSchema);

module.exports = LandingPageDetails;