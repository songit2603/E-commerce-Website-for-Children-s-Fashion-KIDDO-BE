const Blog = require('../models/blogModel'); // Đảm bảo đường dẫn đúng đến mô hình Blog
const CustomError = require("../errors");
const { format } = require('date-fns');
const { StatusCodes } = require("http-status-codes");
const path = require('path');
const fs = require('fs');
// ** =================== CREATE Blog ===================
const createBlog = async (req, res) => {
  const { title, views, desc } = req.body;
  const image = req.file;
  const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');

  const imageData = {
    url: `http://localhost:5000/public/uploads/${path.basename(image.path)}`,
  };

  try {
    const blog = new Blog({
      image: imageData,
      title,
      views,
      desc,
      createDate,
      modifyDate
    });

    // Tạo blog trong cơ sở dữ liệu
    await blog.save();

    res.status(StatusCodes.CREATED).json({ status: 'success', data: blog });
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

// ** =================== GET ALL BLOGS ===================
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find();

    res.status(StatusCodes.OK).json({ status: 'success', data: blogs });
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

// ** =================== GET SINGLE BLOG ===================
const getSingleBlog = async (req, res) => {
  const { id: blogId } = req.params;

  try {
    const blog = await Blog.findById(blogId);

    if (!blog) {
      res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `Không tìm thấy blog với ID ${blogId}` } });
    } else {
      res.status(StatusCodes.OK).json({ status: 'success', data: blog });
    }
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

// ** =================== UPDATE BLOG ===================
const updateBlog = async (req, res) => {
  const blogId = req.params.id; // Lấy ID của blog cần cập nhật
  const updatedData = req.body; // Dữ liệu cập nhật
  const image = req.file; // Tệp ảnh mới (nếu có)

  try {
    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: 'Không tìm thấy blog' } });
    }

    // Kiểm tra xem có tệp ảnh mới được tải lên hay không
    if (image) {
      // Lấy đường dẫn đến tệp ảnh cũ để xóa
      const imagePath = `public/uploads/${path.basename(blog.image.url)}`;

      // Xóa tệp ảnh từ thư mục lưu trữ
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Lấy đường dẫn mới cho tệp ảnh và cập nhật đối tượng blog
      const imageData = {
        url: `http://localhost:5000/public/uploads/${path.basename(image.path)}`,
      };
      blog.image = imageData;
    }

    // Sử dụng toán tử spread (...) để cập nhật tất cả thuộc tính mới từ req.body
    Object.assign(blog, updatedData);

    blog.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    await blog.save();

    res.status(StatusCodes.OK).json({ status: 'success', data: blog });
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

// ** =================== DELETE BLOG ===================
const deleteBlog = async (req, res) => {
  const blogId = req.headers['blog'];  // Lấy ID của blog cần xóa

  try {
    const blog = await Blog.findByIdAndRemove(blogId);

    if (!blog) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy bài viết' }});
    }

    // Lấy đường dẫn đến tệp ảnh của blog để xóa
    const imagePath = `public/uploads/${path.basename(blog.image.url)}`;

    // Xóa tệp ảnh từ thư mục lưu trữ
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json({ status: 'success', data: { message: 'Bài viết đã bị xóa' }});
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' }});
  }
};


module.exports = {
  createBlog,
  getAllBlogs,
  getSingleBlog,
  updateBlog,
  deleteBlog,
};
