const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcryptjs")
const crypto = require("crypto");
const { format } = require("date-fns");
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    default: null
  },
});
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide name"],
    minlength: 3,
    maxlength: 50,
  },

  email: {
    type: String,
    unique: true,
    required: [true, "Please provide email"],
    // Custom Validators package
    validate: {
      // validator package
      validator: validator.isEmail,
      message: "Please provide valid email",
    },
  },
  avatar: imageSchema,
  password: {
    type: String,
    required: [true, "Please provide password"],
  },
  role: {
    type: String,
    enum: ["admin", "user","employee"],
    default: "user",
  },
  cart: {type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  addresses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
  ],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
  }],
  status: {
    type: String,
    enum: ["active", "banned"],
    default: "active", // Set the default status to "active"
  },
  createDate: {
    type: String,
  },
  modifyDate: {
    type: String,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  vipStatus: {
    points: { type: Number, default: 0 }, // Điểm tích lũy mặc định là 0
    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rank" // Tham chiếu đến VipRank thay vì enum
    }
  },
  vouchers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
    },
  ],
})

// Hashed the password before saving the user into database
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password)
  return isMatch
} 

UserSchema.pre('save', function (next) {
  const currentDate = new Date();
  const formattedDate = format(currentDate, "HH:mm dd/MM/yyyy");
  this.createDate = this.createDate || formattedDate;
  this.modifyDate = formattedDate;
  next();
});
UserSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // Token expires after 10 minutes

  return resetToken;
};

module.exports = mongoose.model("Account", UserSchema)
