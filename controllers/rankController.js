const CustomError = require("../errors")
const { format } = require('date-fns');
const { StatusCodes } = require("http-status-codes")
const Rank = require('../models/rankModel')
const User = require('../models/userModel')
const fs = require("fs");
const path = require("path");
// ** ===================  CREATE Rank  ===================
const createRank = async (req, res) => {
  const { rankName, minPoints, maxPoints, description } = req.body;
  const imageRank = req.files.imageRank;
  const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');

  try {
    const normalizedName = rankName.trim().toLowerCase();
    const existingRanks = await Rank.find();
    const matchingRank = existingRanks.find(rank => {
      const rankName = rank.rankName.trim().toLowerCase();
      const normalizedRankName = rankName.replace(/\s+/g, '');
      const normalizedInputName = normalizedName.replace(/\s+/g, '');

      return normalizedRankName === normalizedInputName;
    });

    if (matchingRank) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        data: { message: 'Rank with the same name already exists.' },
      });
    }

    let imageData = [];
    if (imageRank && imageRank.length > 0) {
      imageData = imageRank.map((image) => {
        const imageName = path.basename(image.path);
        return {
          url: `http://localhost:5000/public/uploads/${path.basename(image.path)}`,
          name: imageName,
        };
      });
    }
    const rank = new Rank({
      rankName,
      minPoints,
      maxPoints,
      description,
      createDate,
      modifyDate,
      imageRank: imageData,
    });

    await rank.save();

    res.status(StatusCodes.CREATED).json({ status: 'success', data: rank });
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Internal server error' } });
  }
};
const updateRank= async (req, res) => {
  const rankId = req.params.id; // Lấy ID của danh mục cần cập nhật
  const updatedData = req.body; // Dữ liệu cập nhật
  const imageRank = req.files.imageRank;
  const nameImageRank = req.body.nameImageRank;
  try {
    const rank = await Rank.findById(rankId);

    if (!rank) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy rank' } });
    }
    if (updatedData.rankName) {
      // Kiểm tra trùng lặp dựa trên tên danh mục mới
      const normalizedName = updatedData.rankName.trim().toLowerCase();
      const existingRanks = await Rank.find();

      const matchingRank = existingRanks.find((existingRank) => {
      const rankName = existingRank.rankName.trim().toLowerCase();
      const normalizedRankName = rankName.replace(/\s+/g, '');
      const normalizedInputName = normalizedName.replace(/\s+/g, '');
      return normalizedRankName === normalizedInputName && existingRank._id != rankId;
      });

      if (matchingRank) {
        return res.status(400).json({
          status: 'error',
          data: { message: 'Rank với tên đã tồn tại.' },
        });
      }
      rank.rankName = updatedData.rankName;
    }
    if (updatedData.minPoints) {
      rank.minPoints = updatedData.minPoints;
    }
    if (updatedData.maxPoints) {
        rank.maxPoints = updatedData.maxPoints;
    }
    if (updatedData.description) {
      rank.description = updatedData.description;
    }
    const uploadDirectory = "./public/uploads";
    const existingNameImageRank = rank.imageRank.map(image => image.name);
    for (const existingName of existingNameImageRank) {
      // Kiểm tra nếu imageName không phải là mảng hoặc existingName không tồn tại trong imageName
      if (!nameImageRank.includes(existingName)) {
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
            const index = rank.imageRank.findIndex(image => image.name === existingName);
              if (index !== -1) {
                  rank.imageRank.splice(index, 1);
                  console.log(`Đã xóa ảnh '${existingName}' từ mảng product.images.`);
              }
            }
    }
    if (imageRank && imageRank.length > 0) {
        imageData = imageRank.map((image) => {
            const imageName = path.basename(image.path);
            const existingImageRank = rank.imageRank.find(imageRank => imageRank.name === imageName);
            // Kiểm tra xem tên mới có tồn tại trong danh sách banner hiện tại không
            if (existingImageRank) {
                // Nếu có, sử dụng tên cũ
                return existingImageRank;
            } else {
                // Nếu không, tạo một đối tượng mới với tên mới
                return {
                    url: `http://localhost:5000/public/uploads/${imageName}`,
                    name: imageName,
                };
            }
        });
        rank.imageRank = imageData;
        await rank.save();
    }
    // if (updatedData.vouchers && updatedData.vouchers.length > 0) {
    //   const newVoucherIds = updatedData.vouchers.split(',').map(voucherId => voucherId.trim());
    //   const oldVoucherIds = rank.vouchers.map(voucherId => voucherId.toString());
    //   const vouchersToAdd = newVoucherIds.filter(voucherId => !oldVoucherIds.includes(voucherId));
    //   const vouchersToRemove = oldVoucherIds.filter(voucherId => !newVoucherIds.includes(voucherId));
    //   rank.vouchers = rank.vouchers.concat(vouchersToAdd);
    //   for (const voucherId of vouchersToRemove) {
    //     const index = rank.vouchers.indexOf(voucherId);
    //     if (index !== -1) {
    //       rank.vouchers.splice(index, 1);
    //     }
    //   }
    //   const users = await User.find({ 'Vip.status.level': rankId });
    //   for (const user of users) {
    //     user.vouchers = user.vouchers.concat(vouchersToAdd);

    //     for (const voucherId of vouchersToRemove) {
    //         const index = user.vouchers.indexOf(voucherId);
    //         if (index !== -1) {
    //             user.vouchers.splice(index, 1);
    //         }
    //     }

    //     await user.save();
    //   }
    // }
    rank.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    await rank.save();
    res.json({ status: 'success', data: rank });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const getAllRanks = async (req, res) => {
  try {
      const ranks = await Rank.find()
      res.status(StatusCodes.OK).json({ status: 'success', data: ranks });
  } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const getSingleRank= async (req, res) => {
  const rankId = req.params.id;

  try {
    const rank = await Rank.findOne({ _id: rankId })
    
    if (!rank) {
      res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `No product with the id ${rankId}` } });
    } else {
      res.status(StatusCodes.OK).json({ status: 'success', data: rank });
    }
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const deleteRank = async (req, res) => {
  const rankId = req.params.id; // Lấy rankId từ các tham số yêu cầu

  try {
    const usersWithRank = await User.find({ 'Vip.status.level': rankId });
    if (usersWithRank.length > 0) {
      return res.status(400).json({ status: 'error', data: { message: 'Không thể xóa rank này vì có người dùng đang thuộc mức rank này' } });
    }
    if (!rankId) {
      return res.status(400).json({ status: 'error', data: { message: 'Thiếu rankId trong các tham số yêu cầu' } });
    }
    // Tìm và xóa rank từ cơ sở dữ liệu
    const rank = await Rank.findByIdAndRemove(rankId);

    if (!rank) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy rank' } });
    }
    // Xóa vouchers từ tất cả các người dùng có rank bị xóa
    else {
      // Xóa ảnh liên quan đến rank từ thư mục uploads
      const uploadDirectory = "./public/uploads";
      rank.imageRank.forEach((image) => {
        const imagePath = path.join(uploadDirectory, path.basename(image.url));
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (error) {
            console.error(`Lỗi khi xóa tệp ${imagePath}: ${error.message}`);
          }
        }
      });

      res.json({ status: 'success', data: { message: 'Rank đã bị xóa' } });
    }
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
module.exports = {
    createRank,
    updateRank,
    getAllRanks,
    getSingleRank,
    deleteRank
}