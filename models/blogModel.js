const mongoose = require('mongoose');
const imageSchema = new mongoose.Schema({
    url: {
      type: String,
      required: true,
    },
  });
const blogSchema = new mongoose.Schema({
    image: imageSchema,
    title: {
        type: String,
        required: true,
    },
    views: {
        type: Number,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    createDate: {
        type: String,
      },
    modifyDate: {
        type: String,
    },
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;