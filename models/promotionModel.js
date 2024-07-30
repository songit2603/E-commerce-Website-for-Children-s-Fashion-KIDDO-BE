const mongoose = require("mongoose")

const bannerSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
    maxlength: [500, "Name cannot be more than 120 characters"],
  },
});
const frameSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
    maxlength: [500, "Name cannot be more than 120 characters"],
  },
});
const PromotionSchema = new mongoose.Schema({
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }],
  name: {
    type: String,
    trim: true,
    maxlength: [500, "Name cannot be more than 120 characters"],
  },
  discount: {
    type: Number,
    default: 0, // Giá trị mặc định cho discount
  },
  banner: [bannerSchema],
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  isStart: {
    type: String,
    default: 'Pending', // Giá trị mặc định cho isStart
  },
  frameStyle: [frameSchema]
}
)
module.exports = new mongoose.model("Promotion", PromotionSchema)