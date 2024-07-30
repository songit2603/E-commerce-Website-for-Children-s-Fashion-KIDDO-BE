const mongoose = require("mongoose");

const Variant1Schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide name"],
    trim: true,
    maxlength: [100, "Name cannot be more than 100 characters"],
  },
  imageName: {
    type: String,
  },
  price: {
    type: Number,
    default: null,
  },
  stock: {
    type: Number,
    default: null,
  },
  variant2: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant2", // Liên kết với mô hình Variant2
    },
  ],
  newVariant1Price: {
    type: Number, // Thêm trường giá mới cho màu sắc
  },
  originalPrice: {
    type: Number, // Thêm trường giá gốc cho màu sắc
  },
  netProfit: {
    type: Number, // Thêm trường netProfit cho màu sắc
  },
  index: {
    type: Number, // Thêm trường vị trí
  }
});

module.exports = mongoose.model("Variant1", Variant1Schema);