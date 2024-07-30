const CustomError = require("../errors")
const { format } = require('date-fns');
const { StatusCodes } = require("http-status-codes")
const Voucher = require('../models/voucherModel')
const User = require('../models/userModel')
const shortid = require('shortid');
const fs = require("fs");
const path = require("path");
const moment = require('moment');
// ** ===================  CREATE Voucher  ===================
const createVoucher = async (req, res) => {
    const { description, discountType, discountValue, minPurchase, startDate, endDate, quantity, isActive, userVoucherLimit, voucherType } = req.body;
    const imageVoucher = req.files.imageVoucher;
    const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    try {
      let imageData = [];
      if (imageVoucher && imageVoucher.length > 0) {
      imageData = imageVoucher.map((image) => {
      const imageName = path.basename(image.path);
      return {
          url: `http://localhost:5000/public/uploads/${path.basename(
          image.path
          )}`,
          name: imageName,
      };
      });
      }
      const voucher = new Voucher({
          description,
          discountType,
          discountValue,
          minPurchase,
          startDate,
          endDate,
          quantity,
          isActive,
          createDate,
          modifyDate,
          imageVoucher: imageData,
          userVoucherLimit,
          voucherType
      });
      // Tạo category trong cơ sở dữ liệu
      await voucher.save();
  
      res.status(StatusCodes.CREATED).json({ status: 'success', data: voucher });
    } catch (error) {
      console.error(error.stack);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
const updateVoucher = async (req, res) => {
    const voucherId = req.params.id; // Lấy ID của danh mục cần cập nhật
    const updatedData = req.body; // Dữ liệu cập nhật
    const imageVoucher = req.files.imageVoucher;
    const nameImageVoucher = req.body.nameImageVoucher;
    try {
      const voucher = await Voucher.findById(voucherId);
  
      if (!voucher) {
        return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy rank' } });
      }
      const uploadDirectory = "./public/uploads";
      const existingNameImageVoucher = voucher.imageVoucher.map(image => image.name);
      for (const existingName of existingNameImageVoucher) {
        // Kiểm tra nếu imageName không phải là mảng hoặc existingName không tồn tại trong imageName
        if (!nameImageVoucher.includes(existingName)) {
            // Xóa ảnh từ thư mục uploadDirectory
            const imagePath = path.join(uploadDirectory, existingName);
              if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                        console.log(`Đã xóa ảnh '${existingName}' từ thư mục.`);
                    } catch (error) {
                        console.error(`Lỗi khi xóa ảnh '${existingName}' từ thư mục: ${error.message}`);
                    }
              }
              // Xóa ảnh từ mảng product.imagesVariant
              const index = voucher.imageVoucher.findIndex(image => image.name === existingName);
                if (index !== -1) {
                    voucher.imageVoucher.splice(index, 1);
                    console.log(`Đã xóa ảnh '${existingName}' từ mảng voucher.imageVoucher.`);
                }
              }
      }
      if (imageVoucher && imageVoucher.length > 0) {
        imageData = imageVoucher.map((image) => {
            const imageName = path.basename(image.path);
            const existingImageVoucher = voucher.imageVoucher.find(imageVoucher => imageVoucher.name === imageName);
            // Kiểm tra xem tên mới có tồn tại trong danh sách banner hiện tại không
            if (existingImageVoucher) {
                // Nếu có, sử dụng tên cũ
                return existingImageVoucher;
            } else {
                // Nếu không, tạo một đối tượng mới với tên mới
                return {
                    url: `http://localhost:5000/public/uploads/${imageName}`,
                    name: imageName,
                };
            }
        });
        voucher.imageVoucher = imageData;
        await voucher.save();
      }
      // Sử dụng toán tử spread (...) để cập nhật tất cả thuộc tính mới từ req.body
      Object.assign(voucher, updatedData);
  
      voucher.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
      await voucher.save();
      res.json({ status: 'success', data: voucher });
    } catch (error) {
      console.error(error.stack);
      res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
const getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find();
        res.status(StatusCodes.OK).json({ status: 'success', data: vouchers });
    } catch (error) {
        console.error(error.stack);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
const getSingleVoucher= async (req, res) => {
    const voucherId = req.params.id;
  
    try {
      const voucher = await Voucher.findOne({ _id: voucherId })
      
      if (!voucher) {
        res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `No product with the id ${voucherId}` } });
      } else {
        res.status(StatusCodes.OK).json({ status: 'success', data: voucher });
      }
    } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
const deleteVoucher = async (req, res) => {
    const voucherId = req.params.id; // Extract the categoryId from the request body
  
    try {
      if (!voucherId) {
        return res.status(400).json({ status: 'error', data: { message: 'Missing voucherId in request body' } });
      }
      // Nếu không có sản phẩm trong danh mục, thì xóa danh mục
      const voucher = await Voucher.findByIdAndRemove(voucherId);
  
      if (!voucher) {
        return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy voucher' } });
      }
      const uploadDirectory = "./public/uploads";
        // Xóa hình ảnh cục bộ
      voucher.imageVoucher.forEach((image) => {
          const imagePath = path.join(uploadDirectory, path.basename(image.url));
  
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
            } catch (error) {
              console.error(`Lỗi khi xóa tệp ${imagePath}: ${error.message}`);
            }
          }
      });
  
      res.json({ status: 'success', data: { message: 'Voucher đã bị xóa' } });
    } catch (error) {
      console.error(error.stack);
      res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
}; 
const checkVoucher = async (req, res) => {
  const { voucherCode, userId, total } = req.body; // Extract the categoryId from the request body
  try {
    if (!voucherCode) {
      return res.status(400).json({ status: 'error', data: { message: 'Missing voucherCode in request body' } });
    }
    // Nếu không có sản phẩm trong danh mục, thì xóa danh mục
    const appliedVoucher = await Voucher.findOne({ code: voucherCode });
    if (!appliedVoucher) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không hợp lệ' });
    }
    if (!appliedVoucher.isActive) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không khả dụng' });
    }
    if (appliedVoucher.quantity = 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher đã đạt tới giới hạn cho phép, không thể dùng' });
    }
    const currentTime = moment(); // Thời gian hiện tại
    const startDate = moment(appliedVoucher.startDate, 'HH:mm DD/MM/YYYY').toDate();
    const endDate = moment(appliedVoucher.endDate, 'HH:mm DD/MM/YYYY').toDate();

    if (currentTime < startDate || endDate < currentTime) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không trong thời gian hiệu lực' });
    }
    if (appliedVoucher.usedByUsers.some(user => user.userId.toString() === userId && user.usesCount >= appliedVoucher.userVoucherLimit)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Bạn đã sử dụng voucher này quá số lần cho phép' });
    }
    if (total < appliedVoucher.minPurchase) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Tổng giá trị đơn hàng không đạt yêu cầu tối thiểu để sử dụng mã voucher' });
    }
    const user = await User.findById(userId).populate("vipStatus.level").populate("vouchers.voucher");
    if (appliedVoucher.voucherType !== 'allUsers' && user.vipStatus.level.rankName !== appliedVoucher.voucherType) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không áp dụng cho tất cả người dùng' });
    }
    res.json({ status: 'success', data: appliedVoucher });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const addToCartVoucher = async (req, res) => {
  const { voucherCode, userId } = req.body;
  try {
      // Kiểm tra voucher có tồn tại và hợp lệ không
      const appliedVoucher = await Voucher.findOne({ code: voucherCode });

      if (!appliedVoucher) {
          return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không hợp lệ' });
      }
      if (!appliedVoucher.isActive) {
          return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không khả dụng' });
      }
      const currentTime = moment(); // Thời gian hiện tại
      const startDate = moment(appliedVoucher.startDate, 'HH:mm DD/MM/YYYY').toDate();
      const endDate = moment(appliedVoucher.endDate, 'HH:mm DD/MM/YYYY').toDate();

      if (currentTime < startDate || endDate < currentTime) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không trong thời gian hiệu lực' });
      }

      // Kiểm tra xem người dùng đã thêm voucher này vào giỏ của họ chưa
      const user = await User.findById(userId).populate("vipStatus.level").populate("vouchers.voucher");
      if (!user) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'Người dùng không tồn tại' });
      }
      if (appliedVoucher.voucherType !== 'allUsers' && user.vipStatus.level.rankName !== appliedVoucher.voucherType) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher không áp dụng cho tất cả người dùng' });
      }
      if (appliedVoucher.usedByUsers.some(user => user.userId.toString() === userId && user.usesCount >= appliedVoucher.userVoucherLimit)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Bạn đã sử dụng voucher này quá số lần cho phép' });
      }
      // Kiểm tra xem voucher đã được thêm vào giỏ của người dùng chưa và đã đạt đến giới hạn sử dụng chưa
      const voucherInCart = user.vouchers.find(item => item.toString() === appliedVoucher._id.toString());
      if (voucherInCart) {
          return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Voucher đã tồn tại trong giỏ hàng' });
      }

      // Thêm voucher vào giỏ của người dùng
      user.vouchers.push(appliedVoucher._id);
      await user.save();

      res.json({ status: 'success', data: user });
  } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', message: 'Lỗi server' });
  }
};
module.exports = {
    createVoucher,
    updateVoucher,
    getAllVouchers,
    getSingleVoucher,
    deleteVoucher,
    checkVoucher,
    addToCartVoucher,
}