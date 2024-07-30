const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;