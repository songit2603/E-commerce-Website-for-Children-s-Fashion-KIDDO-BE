const mongoose = require('mongoose');

const dailyRevenueDetailSchema = new mongoose.Schema({
  date: { type: String },  // Ngày cụ thể cho dữ liệu doanh thu
  ordersPlaced: { type: Number, required: true, default: 0 },  // Tổng số đơn đặt hàng
  netProfit: { type: Number, required: true, default: 0 },  // Lợi nhuận ròng từ đơn hàng
  ordersCancelled: { type: Number, required: true, default: 0 },  // Số đơn hủy hoặc trả lại
  percentNetProfit: { type: String }
});

const revenueSchema = new mongoose.Schema({
  totalRevenue: { type: Number, required: true },
  totalNetProfit: { type: Number,  required: true  },
  totalOrders: { type: Number, required: true },
  totalOrders: { type: Number, required: true },
  totalUsers: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }],
  topSellingProducts: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      totalQuantity: { type: Number, default: 0 },  // Tổng số lượng sản phẩm bán được
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
      stock: { type: Number, default: 0 },
    }
  ],
  recentOrders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  timestamp: { type: String },
  dailyDetails: [dailyRevenueDetailSchema],
});

const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = Revenue;