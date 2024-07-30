const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    name_slug: {
        type: String,
    },
    // // image: String,
    createDate: {
        type: String,
      },
    modifyDate: {
        type: String,
      },
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
    ],
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;