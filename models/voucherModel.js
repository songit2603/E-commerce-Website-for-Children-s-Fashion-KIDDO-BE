const mongoose = require("mongoose");

function generateRandomCode(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const imageVoucherSchema = new mongoose.Schema({
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

const VoucherSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
  },
  description: {
    type: String,
  },
  voucherType: {
    type: String,
    required: true,
    enum: ['Bronze', 'Silver', 'Gold', 'Diamond', 'VIP', 'VVIP', 'allUsers']
  },
  discountType: {
    type: String,
    required: true,
    enum: ['Percent', 'Cash']
  },
  discountValue: {
    type: Number,
    min: 0,
  },
  minPurchase: {
    type: Number,
    min: 0,
  },
  startDate: {
    type: String,
  },
  endDate: {
    type: String,
  },
  quantity: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createDate: {
    type: String
  },
  modifyDate: {
    type: String
  },
  imageVoucher: [imageVoucherSchema],
  userVoucherLimit: {
    type: Number,
    default: 1 // Số lần sử dụng mặc định là 1
  },
  usedByUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usesCount: {
      type: Number,
      default: 0
    }
  }]
});

VoucherSchema.pre('save', function(next) {
  if (!this.code) {
    if (this.discountType && this.discountValue) {
      this.code = generateRandomCode(8) + '-' + (this.discountType === 'Percent' ? `${this.discountValue}P` : `${this.discountValue/1000}K`);
    } else {
      this.code = generateRandomCode(8);
    }
  }
  next();
});

module.exports = mongoose.model("Voucher", VoucherSchema);