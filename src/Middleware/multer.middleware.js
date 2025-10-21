const multer = require("multer");

// Generate the random name:
const randomStr = (length) => {
  let str = "aabcddeffghijkllmnopqrsstuvwxyz";
  let randStr = "";

  for (let i = 0; i < length; i++) {
    randStr += str[Math.floor(Math.random() * str.length)];
  }
  return randStr;
};

// Create the storage function which handle the destination and the file name:
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public");
  },
  filename: (req, file, cb) => {
    cb(null, randomStr(5) + "-" + file.originalname);
  },
});

// Checking the file type:
const fileFilter = (req, file, cb) => {
  if (
    [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ].includes(file.mimetype)
  ) {
    cb(null, true);
  } else cb(null, false);
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;
