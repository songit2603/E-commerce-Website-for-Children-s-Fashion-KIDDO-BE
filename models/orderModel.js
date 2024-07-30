const mongoose = require('mongoose');
function generateRandomCode(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    default: () => `KIDDO-${generateRandomCode(5)}`, // Sử dụng 6 ký tự từ mã ngắn
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Account'}, // Reference to the User model or User ID
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductSnapshot', required: true }, // Reference to the Product model or Product ID
      variant1: {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Variant1',
          default: null // Mặc định là null nếu không có tên variant2 hoặc không có variant2Id được gửi đến
        },
        name: {
          type: String,
          trim: true,
          maxlength: [500, "Name cannot be more than 120 characters"],
          default: null // Mặc định là null nếu không có tên variant2
        },
      },
      variant2: {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Variant2',
          default: null // Mặc định là null nếu không có tên variant2 hoặc không có variant2Id được gửi đến
        },
        name: {
          type: String,
          trim: true,
          maxlength: [500, "Name cannot be more than 120 characters"],
          default: null // Mặc định là null nếu không có tên variant2
        }
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
      isProductReviewed: {
        type: Boolean,
        default: false,
      }
    }
  ],
  name: { type: String},
  total: { type: Number, default: 0 },
  totalItem: {type: Number, default: 0},
  totalNetProfit: {type: Number, default: 0},
  taxFee: {type: Number, default: 0},
  shippingAddress: { type: String, required: true },
  shippingCost: {type: Number, default:0},
  phoneNumber: {
    type: String
  },
  email: {
    type: String
  },
  paymentMethod: { type: String, required: true },
  paymentStatus: { type: String, default: 'Pending' },
  transactionId: { type: String },
  redirectUrl: { type: String },
  status: { type: String, default: 'Pending' }, // You can have various status like 'Pending', 'Shipped', 'Delivered', etc.
  createDate: {
    type: String,
  },
  modifyDate: {
    type: String,
  },
  isSuccessReviewed: {
    type: Boolean,
    default: false,
  },
  voucher: {
    type: String,
    default: null,
  },
  voucherValue: {
    type: Number,
    default: 0
  },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
