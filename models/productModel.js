const mongoose = require("mongoose")

const imageSchema = new mongoose.Schema({
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
const imageVariantSchema = new mongoose.Schema({
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

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide product name"],
      trim: true,
      maxlength: [500, "Name cannot be more than 120 characters"],
    },
    name_slug: {
      type: String,
      trim: true,
      maxlength: [500, "Name cannot be more than 100 characters"],
    },
    stock: {
      type: Number,
      default: null,
    },
    price: {
      type: Number,
      default: null,
    },
    profit: {
      type: Number,
      default: 0, // Giá trị mặc định cho discount
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    netProfit: {
      type: Number,
      default: null,
    },
    minPrice: {
      type: Number,
      default: null,
    },
    maxPrice: {
      type: Number,
      default: null,
    },
    newPrice: {
      type: Number,
      default: null,
    },
    specification: {
      type: String,
      maxlength: [3000, "Description can not be more than 3000 characters"],
    },
    description: {
      type: String,
      maxlength: [3000, "Description can not be more than 3000 characters"],
    },
    linkrv: {
      type: String,
      maxlength: [1000, "Description can not be more than 1000 characters"],
    },
    images: [imageSchema],
    imagesVariant: [imageVariantSchema],
    discount: {
      type: Number,
      default: 0, // Giá trị mặc định cho discount
    },
    publishedDate: {
      type: String,
    },
    updatedAt: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please category"],
      ref: 'Category',
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please brand"],
      ref: 'Brand',
    },
    // user: {
    //   type: mongoose.Types.ObjectId,
    //   ref: "User",
    // },
    variant1: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant1",
    }],
    variantName1:{
      type: String,
      trim: true,
      maxlength: [500, "Name cannot be more than 120 characters"],
      default: null, 
    },
    variantName2:{
      type: String,
      trim: true,
      maxlength: [500, "Name cannot be more than 120 characters"],
      default: null, 
    },
    isPublish: {
      type: Boolean,
      default: false, 
    },
    variantClassCount: {
      type: Number,
      default: 0, 
    },
    orders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    }],
    ordersCount: {
      type: Number,
      default: 0,
    },
    totalSold: {
      type: Number,
      default: 0,
    },
    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    }],
    averageRating: {
      type: Number,
      default: 0, // Giá trị mặc định khi không có đánh giá nào
      min: 0,     // Đảm bảo rằng rating không thấp hơn 0
      max: 5      // Đảm bảo rằng rating không cao hơn 5
    },
    ratingCounts: {
      fiveStar: { type: Number, default: 0 },
      fourStar: { type: Number, default: 0 },
      threeStar: { type: Number, default: 0 },
      twoStar: { type: Number, default: 0 },
      oneStar: { type: Number, default: 0 },
    },
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
    },
    frameStyle: [frameSchema],
    relatedProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],
  }, { versionKey: false }
)

// If I want to search single product, in tha product I also want to have all reviews associated with that product.
// ProductSchema.virtual("reviews", {
//   ref: "Review",
//   localField: "_id",
//   foreignField: "product",
//   justOne: false,
//   // match: {rating: 5} // Get the reviews whose rating is only 5.
// })
// ProductSchema.virtual("ordersCountVirtual").get(function () {
//   return this.orders.length;
// });

// ProductSchema.pre("remove", async function (next) {
//   // Go to 'Reveiw; and delete all the review that are associated with this particular product
//   await this.model("Review").deleteMany({ product: this._id })
// })

module.exports = new mongoose.model("Product", ProductSchema)
