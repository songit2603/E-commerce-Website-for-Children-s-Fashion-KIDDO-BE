const mongoose = require("mongoose");

const Variant2Schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide name"],
    trim: true,
    maxlength: [50, "Size cannot be more than 50 characters"],
  },
  price: {
    type: Number,
    required: [true, "Please provide price"],
  },
  stock: {
    type: Number,
    required: [true, "Please provide stock"],
  },
  netProfit: {
    type: Number, // Thêm trường netProfit cho biến thể
  },
  newVariant2Price: {
    type: Number, // Thêm trường giá mới cho biến thể
  },
  originalPrice: {
    type: Number, // Thêm trường giá gốc cho biến thể
  },
  position: {
    type: Number,
  },
  index: {
    type: Number,
  }
  // Thêm các thuộc tính khác cho biến thể (nếu cần).
});

module.exports = mongoose.model("Variant2", Variant2Schema);