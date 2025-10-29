const multer = require("multer");

// Use memory storage for serverless environments
const storage = multer.memoryStorage();

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  if (["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WebP files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware to handle file upload and errors
const handleFileUpload = (req, res, next) => {
  upload.single('itemImageUrl')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Error processing file'
      });
    }
    next();
  });
};

module.exports = handleFileUpload;
