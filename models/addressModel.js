const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide product name"],
    trim: true,
    maxlength: [500, "Name cannot be more than 120 characters"],
  },
  phoneNumber: {
    type: String,
  },
  shippingAddress: {
    type: String,
    required: [true, "Please provide address"],
  },
  createDate: {
    type: String,
  },
  modifyDate: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account", // Assuming your User model is named "User"
  },
  email: {
    type: String,
  },
  isDefault: {
    type: Boolean,
    default: false, 
  },
});

module.exports = mongoose.model("Address", AddressSchema);