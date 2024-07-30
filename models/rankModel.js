const mongoose = require("mongoose");
const imageRankSchema = new mongoose.Schema({
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
const RankSchema = new mongoose.Schema({
  rankName: {
    type: String,
    required: [true, "Please provide the rank name"],
  },
  minPoints: {
    type: Number,
    required: [true, "Please provide the minimum points for this rank"],
    min: 0
  },
  maxPoints: {
    type: Number,
    required: [true, "Please provide the maximum points for this rank"],
    validate: {
      validator: function(value) {
        return value > this.minPoints;
      },
      message: props => `Maximum points must be greater than minimum points`
    }
  },
  description: {
    type: String,
    maxlength: 500 // Giới hạn mô tả tối đa 500 ký tự
  },
  createDate: {
    type: String,
  },
  modifyDate: {
    type: String,
  },
  imageRank: [imageRankSchema],
});

module.exports = mongoose.model("Rank", RankSchema);