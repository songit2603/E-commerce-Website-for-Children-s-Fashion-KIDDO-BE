const multer = require('multer');

// Cấu hình Multer để lưu trữ tệp trong thư mục 'uploads'
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // Đường dẫn đến thư mục lưu trữ tệp
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Sử dụng tên gốc của tệp
  },
});

const upload = multer({ storage: storage });


module.exports = upload;