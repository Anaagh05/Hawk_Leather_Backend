const LandingPageDetails = require("../../Models/Landing_page_details.schema");

const locationController = {
    getLocation: async (req, res) => {
        try {
            const data = await LandingPageDetails.findOne();
            return res.status(200).json({
                message: "Location fetched successfully",
                location: data?.location || null,
                phoneNumber: data?.phoneNumber || null,
                email: data?.email || null
            });
        } catch (error) {
            console.log("Error in getLocation: ", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    updateLocation: async (req, res) => {
        try {
            const { location, phoneNumber, email } = req.body;

            if (!location && !phoneNumber && !email) {
                return res.status(400).json({ message: "At least one of location, phoneNumber, or email is required" });
            }

            const updateFields = {};
            if (location) updateFields.location = location;
            if (phoneNumber) {
                if (phoneNumber.length > 13){
                    return res.status(400).json({"message":"Phone Number cannot exceed 10 Numbers"})
                }
                
                updateFields.phoneNumber = phoneNumber;
            }
            if (email) updateFields.email = email;

            const updated = await LandingPageDetails.findOneAndUpdate(
                {},
                { $set: updateFields },
                { new: true, upsert: true }
            );

            return res.status(200).json({
                message: "Location updated successfully",
                location: updated.location || null,
                phoneNumber: updated.phoneNumber || null,
                email: updated.email || null
            });
        } catch (error) {
            console.log("Error in updateLocation: ", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
};

module.exports = locationController;