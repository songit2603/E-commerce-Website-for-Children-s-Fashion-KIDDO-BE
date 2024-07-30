const mongoose = require("mongoose")

const imageReviewSchema = new mongoose.Schema({
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
const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Account'},
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant1:  { type: mongoose.Schema.Types.ObjectId, ref: 'Variant1' }, 
  variant2: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant2' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createDate: {
    type: String,
  },
  modifyDate: {
    type: String,
  },
  reviewContent: {
    type: String,
    maxlength: [3000, "Description can not be more than 3000 characters"],
  },
  rating: {
    type: Number,
    required: true
  },
  reviewComments: [{
    shopOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    reviewCommentContent: {
        type: String,
    },
    createDate: {
      type: String,
    },
    modifyDate: {
      type: String,
    },
  }],
  imagesReview:[imageReviewSchema],
  isUpdated: {
    type: Number,
    default: 0
  },
  isReviewed: {
    type: Boolean,
    default: false
  }
}
)
module.exports = new mongoose.model("Review", ReviewSchema)
