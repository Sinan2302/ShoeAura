const multer = require('multer');

const storage = multer.memoryStorage(); 
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, 
}).fields([{ name: 'croppedImages', maxCount: 5 }]); 

module.exports = upload;
