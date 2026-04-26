const LandingPageDetails = require("../../Models/Landing_page_details.schema");

const descriptionController = {
    getDescription: async (req, res) => {
        try {
            const data = await LandingPageDetails.findOne();
            return res.status(200).json({
                message: "Description fetched successfully",
                upperDescription: data?.upperDescription || null,
                lowerDescription: data?.lowerDescription || null
            });
        } catch (error) {
            console.log("Error in getDescription: ", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },

    updateDescription: async (req, res) => {
        try {
            const { upperDescription, lowerDescription } = req.body;

            if (!upperDescription && !lowerDescription) {
                return res.status(400).json({ message: "At least one of upperDescription or lowerDescription is required" });
            }

            const updateFields = {};
            if (upperDescription){
                // console.log(upperDescription.length);
                if (upperDescription.length > 250) {
                    return res.status(400).json({ message: "Upper description cannot exceed 250 characters" });
                }
                updateFields.upperDescription = upperDescription;
            } 
            if (lowerDescription){
                // console.log(lowerDescription.length);
                if (lowerDescription.length > 500) {
                    return res.status(400).json({ message: "Lower description cannot exceed 500 characters" });
                }
                updateFields.lowerDescription = lowerDescription;
            }

            const updated = await LandingPageDetails.findOneAndUpdate(
                {},
                { $set: updateFields },
                { new: true, upsert: true }
            );

            return res.status(200).json({
                message: "Description updated successfully",
                upperDescription: updated.upperDescription || null,
                lowerDescription: updated.lowerDescription || null
            });
        } catch (error) {
            console.log("Error in updateDescription: ", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
};

module.exports = descriptionController;