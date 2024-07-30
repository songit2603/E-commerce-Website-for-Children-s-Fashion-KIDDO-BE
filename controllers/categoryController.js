const Category = require('../models/categoryModel')
const CustomError = require("../errors")
const { format } = require('date-fns');
const { StatusCodes } = require("http-status-codes")
const Product = require('../models/productModel')
// ** ===================  CREATE Category  ===================
const createCategory = async (req, res) => {
  const { name } = req.body;
  const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  try {
    const normalizedName = name.trim().toLowerCase();
    const existingCategories = await Category.find();

    const matchingCategory = existingCategories.find(category => {
    const categoryName = category.name.trim().toLowerCase();
    // Loại bỏ khoảng trắng giữa các từ trong tên danh mục
    const normalizedCategoryName = categoryName.replace(/\s+/g, '');
    // Loại bỏ khoảng trắng giữa các từ trong tên đã nhập
    const normalizedInputName = normalizedName.replace(/\s+/g, '');

    // So sánh tên danh mục và tên đã nhập đã chuẩn hóa
    return normalizedCategoryName === normalizedInputName;
  });

  if (matchingCategory) {
  // Tìm thấy danh mục khớp
  return res.status(StatusCodes.BAD_REQUEST).json({
    status: 'error',
    data: { message: 'Category with the same name already exists.' },
  });
}

    const category = new Category({
      name,
      createDate,
      modifyDate
    });

    // Tạo category trong cơ sở dữ liệu
    await category.save();

    res.status(StatusCodes.CREATED).json({ status: 'success', data: category });
  } catch (error) {
    console.error(error.stack);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

const getAllCategories = async (req, res) => {
  try {
      const categories = await Category.find();
      for (let category of categories) {
              category.name_slug = category.name
                  .trim()
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "") // Loại bỏ các dấu thanh trong tiếng Việt
                  .replace(/đ/g, "d") // Chuyển đổi ký tự "đ" thành "d"
                  .replace(/[^a-z0-9\s]+/g, '-') // Loại bỏ các ký tự không phải chữ cái, số hoặc dấu space và thay thế bằng dấu gạch ngang
                  .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
                  .replace(/-+/g, '-') // Loại bỏ các dấu gạch ngang trùng lặp
                  .replace(/^-|-$/g, ''); // Loại bỏ dấu gạch ngang ở đầu và cuối chuỗi
              await category.save();
      }
      res.status(StatusCodes.OK).json({ status: 'success', data: categories });
  } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

const getSingleCategory= async (req, res) => {
    const categoryId = req.params.id;
  
    try {
      const category = await Category.findOne({ _id: categoryId }).populate("products")
      
      if (!category) {
        res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `No product with the id ${categoryId}` } });
      } else {
        res.status(StatusCodes.OK).json({ status: 'success', data: category });
      }
    } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
const updateCategory = async (req, res) => {
  const categoryId = req.params.id; // Lấy ID của danh mục cần cập nhật
  const updatedData = req.body; // Dữ liệu cập nhật

  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy danh mục' } });
    }
    if (updatedData.name) {
      const normalizedName = updatedData.name.trim().toLowerCase();
      const existingCategories = await Category.find();

      const matchingCategory = existingCategories.find((existingCategory) => {
        const categoryName = existingCategory.name.trim().toLowerCase();
        const normalizedCategoryName = categoryName.replace(/\s+/g, '');
        const normalizedInputName = normalizedName.replace(/\s+/g, '');
        return normalizedCategoryName === normalizedInputName && existingCategory._id != categoryId;
      });

      if (matchingCategory) {
        return res.status(400).json({
          status: 'error',
          data: { message: 'Danh mục với cùng tên đã tồn tại.' },
        });
      }
    }

    // Sử dụng toán tử spread (...) để cập nhật tất cả thuộc tính mới từ req.body
    Object.assign(category, updatedData);

    category.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    await category.save();
    res.json({ status: 'success', data: category });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
  const deleteCategory = async (req, res) => {
    const categoryId = req.params.id; // Extract the categoryId from the request body
  
    if (!categoryId) {
      return res.status(400).json({ status: 'error', data: { message: 'Missing categoryId in request body' } });
    }
  
    try {
      // Kiểm tra xem có sản phẩm nào liên quan đến danh mục này không
      const productsInCategory = await Product.find({ category: categoryId });
  
      if (productsInCategory.length > 0) {
        // Nếu có sản phẩm trong danh mục, trả về lỗi và thông báo
        return res.status(400).json({ status: 'error', data: { message: 'Không thể xóa danh mục vì có sản phẩm liên quan.' } });
      } else {
        // Nếu không có sản phẩm trong danh mục, thì xóa danh mục
        const category = await Category.findByIdAndRemove(categoryId);
  
        if (!category) {
          return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy danh mục' } });
        }
  
        res.json({ status: 'success', data: { message: 'Danh mục đã bị xóa' } });
      }
    } catch (error) {
      console.error(error.stack);
      res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
  }; 

module.exports = {
    createCategory,
    getAllCategories,
    getSingleCategory,
    updateCategory,
    deleteCategory,

  }