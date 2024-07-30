const Brand = require('../models/brandModel')
const CustomError = require("../errors")
const { format } = require('date-fns');
const { StatusCodes } = require("http-status-codes")
const Product = require('../models/productModel');
// ** ===================  CREATE Category  ===================
const createBrand = async (req, res) => {
  const { name } = req.body;
  const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  try {
    const normalizedName = name.trim().toLowerCase();
    const existingBrands = await Brand.find();

    const matchingBrand= existingBrands.find(brand => {
    const brandName = brand.name.trim().toLowerCase();
    // Loại bỏ khoảng trắng giữa các từ trong tên danh mục
    const normalizedBrandName = brandName.replace(/\s+/g, '');
    // Loại bỏ khoảng trắng giữa các từ trong tên đã nhập
    const normalizedInputName = normalizedName.replace(/\s+/g, '');

    // So sánh tên danh mục và tên đã nhập đã chuẩn hóa
    return normalizedBrandName === normalizedInputName;
  });

  if (matchingBrand) {
  // Tìm thấy danh mục khớp
  return res.status(StatusCodes.BAD_REQUEST).json({
    status: 'error',
    data: { message: 'Brand with the same name already exists.' },
  });
}

    const brand = new Brand({
      name,
      createDate,
      modifyDate
    });

    // Tạo category trong cơ sở dữ liệu
    await brand.save();

    res.status(StatusCodes.CREATED).json({ status: 'success', data: brand });
  } catch (error) {
    console.error(error.stack);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

// ** ===================  GET ALL PRODUCTS  ===================
const getAllBrands = async (req, res) => {
    try {
      const brands = await Brand.find();
      for (let brand of brands) {
        brand.name_slug = brand.name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Loại bỏ các dấu thanh trong tiếng Việt
            .replace(/đ/g, "d") // Chuyển đổi ký tự "đ" thành "d"
            .replace(/[^a-z0-9\s]+/g, '-') // Loại bỏ các ký tự không phải chữ cái, số hoặc dấu space và thay thế bằng dấu gạch ngang
            .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
            .replace(/-+/g, '-') // Loại bỏ các dấu gạch ngang trùng lặp
            .replace(/^-|-$/g, ''); // Loại bỏ dấu gạch ngang ở đầu và cuối chuỗi
        await brand.save();
}
      res.status(StatusCodes.OK).json({ status: 'success', data: brands});
    } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};

  // ** ===================  GET SINGLE PRODUCT  ===================
const getSingleBrand= async (req, res) => {
    const { id: brandId } = req.params;
  
    try {
      const brand = await Brand.findOne({ _id: brandId })
      
      if (!brand) {
        res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `No product with the id ${brandId}` } });
      } else {
        res.status(StatusCodes.OK).json({ status: 'success', data: brand });
      }
    } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
const updateBrand = async (req, res) => {
  const brandId = req.params.id; // Lấy ID của thương hiệu cần cập nhật
  const updatedData = req.body; // Dữ liệu cập nhật

  try {
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy thương hiệu' } });
    }
    if (updatedData.name) {
      const normalizedName = updatedData.name.trim().toLowerCase();
      const existingBrands = await Brand.find();

      const matchingBrand = existingBrands.find((existingBrand) => {
        const brandName = existingBrand.name.trim().toLowerCase();
        const normalizedBrandName = brandName.replace(/\s+/g, '');
        const normalizedInputName = normalizedName.replace(/\s+/g, '');
        return normalizedBrandName === normalizedInputName && existingBrand._id != brandId;
      });

      if (matchingBrand) {
        return res.status(400).json({
          status: 'error',
          data: { message: 'Thương hiệu với cùng tên đã tồn tại.' },
        });
      }
    }

    // Sử dụng toán tử spread (...) để cập nhật tất cả thuộc tính mới từ req.body
    Object.assign(brand, updatedData);
    brand.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');

    await brand.save();
    res.json({ status: 'success', data: brand });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
  // ** ===================  DELETE PRODUCT  ===================
  const deleteBrand = async (req, res) => {
    const brandId = req.params.id; // Extract the categoryId from the request body
  
    if (!brandId) {
      return res.status(400).json({ status: 'error', data: { message: 'Missing brandId in request body' }});
    }
  
    try {
      // Kiểm tra xem có sản phẩm nào liên quan đến thương hiệu này không
      const productsInBrand = await Product.find({ brand: brandId });
  
      if (productsInBrand.length > 0) {
        // Nếu có sản phẩm liên quan đến thương hiệu, trả về lỗi và thông báo
        return res.status(400).json({ status: 'error', data: { message: 'Không thể xóa thương hiệu vì có sản phẩm liên quan.' }});
      } else {
        // Nếu không có sản phẩm liên quan đến thương hiệu, thì xóa thương hiệu
        const brand = await Brand.findByIdAndRemove(brandId);
  
        if (!brand) {
          return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy thương hiệu' }});
        }
  
        res.json({ status: 'success', data: { message: 'Thương hiệu đã bị xóa' }});
      }
    } catch (error) {
      console.error(error.stack);
      res.status(500).json({ status: 'error', data: { message: 'Lỗi server' }});
    }
  };
  

module.exports = {
    createBrand,
    getAllBrands,
    getSingleBrand,
    updateBrand,
    deleteBrand,

  }