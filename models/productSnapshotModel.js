const mongoose = require('mongoose');

const productSnapshotSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Tham chiếu đến sản phẩm
  data: { type: mongoose.Schema.Types.Mixed, required: true }, // Dữ liệu của sản phẩm
  createdAt: { type: String }, // Thời gian tạo bản sao
});

const ProductSnapshot = mongoose.model('ProductSnapshot', productSnapshotSchema);

module.exports = ProductSnapshot;