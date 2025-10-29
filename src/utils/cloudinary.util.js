const cloudinary = require("cloudinary").v2;
const { Readable } = require('stream');
const streamifier = require('streamifier');
require("dotenv").config({
    path: "./.env"
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (file, category) => {
    try {
        if (!file || !file.buffer) {
            console.error('No file buffer provided');
            return null;
        }

        // Create a promise to handle the upload
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'auto',
                    folder: `HawkExports/${category === 'Bags' ? 'Bags' : (category === 'Purses' ? 'Purses' : 'Belts')}`
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return reject(error);
                    }
                    resolve(result);
                }
            );

            // Convert buffer to stream and pipe to Cloudinary
            const bufferStream = new Readable();
            bufferStream.push(file.buffer);
            bufferStream.push(null); // Signals the end of the stream
            
            bufferStream.pipe(uploadStream);
        });
    } catch (error) {
        console.error('Error in uploadOnCloudinary:', error);
        return null;
    }
};


const deleteFromCloudinary = async (public_id)=>{
    try {
        const response = await cloudinary.uploader.destroy(public_id);
        return response;
    } catch (err) {
        console.log("Error in While Deleting:",err);
        return null;
    }
}


module.exports = {uploadOnCloudinary,deleteFromCloudinary};