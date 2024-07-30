const User = require("../models/userModel")
const Rank = require("../models/rankModel")
const Order = require("../models/orderModel")
const Cart = require("../models/cartModel")
const Variant1 = require('../models/variant1Model'); // Import model Sản phẩm
const Variant2 = require('../models/variant2Model'); // Import model Sản phẩm
const Product = require("../models/productModel")
const { StatusCodes } = require("http-status-codes")
const CustomError = require("../errors")
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const { format } = require("date-fns");
const {
  createTokenUser,
  attachCookiesToResponse,
  checkPermissions,
} = require("../utils")
//** ======================== calculateUserLevel ========================
const calculateUserLevel = (totalPoints, ranks) => {
  let userLevel = null;
  for (const rank of ranks) {
    if (totalPoints >= rank.minPoints && totalPoints <= rank.maxPoints) {
      userLevel = rank._id;
      break;
    }
  }
  
  if (!userLevel) {
    let closestRank = null;
    let minDifference = Infinity;
    
    for (const rank of ranks) {
      const difference = Math.abs(totalPoints - rank.minPoints);
      if (difference < minDifference) {
        minDifference = difference;
        closestRank = rank;
      }
    }
    
    userLevel = closestRank._id;
  }
  
  return userLevel;
};
//** ======================== CheckExpiredVoucher ========================
const removeExpiredVouchers = async (userId) => {
  const user = await User.findById(userId).populate("vouchers");

  if (!user) {
    throw new CustomError.NotFoundError('Người dùng không tồn tại');
  }
  const currentTime = moment(); // Thời gian hiện tại

  // Lọc các voucher hợp lệ (chưa hết hạn)
  const validVouchers = user.vouchers.filter(voucherItem => {
    const endDate = moment(voucherItem.endDate, 'HH:mm DD/MM/YYYY').toDate();
    return endDate > currentTime;
  });

  // Cập nhật danh sách voucher của người dùng chỉ bao gồm các voucher hợp lệ
  user.vouchers = validVouchers;
  await user.save();

  return user;
};
//** ======================== GetCartandOrderByUser ========================
const getCartandOrderByAccount = async (req, res) => {
  try {
    const userId = req.params.id;
    await removeExpiredVouchers(userId);
    const ranks = await Rank.find();
    // Find the user by ID and populate the "cart" field
    let user = await User.findById(userId)
    .populate({
      path: "cart",
      select: "_id items total",
      populate: {
        path: "items.product items.variant1 items.variant2",// Đặt path tới trường chứa ID của sản phẩm trong items
      }
    }).populate({
      path: "orders",
      select: "_id items user total totalItem voucher taxFee shippingAddress shippingCost phoneNumber email paymentMethod status createDate modifyDate isSuccessReviewed orderCode", populate: {
        path: "user items.product", // Đặt path tới trường chứa ID của sản phẩm trong items
      }
    }).populate({
      path: "addresses",
      select: "address"
    }).populate("vipStatus.level").populate("vouchers");

    if (!user) {
      return res.status(404).json({ status: 'error', data: { message: 'User not found' } });
    }
    if (user.cart) {
      let total = 0; // Khởi tạo tổng giá trị của giỏ hàng
  
      // Duyệt qua từng sản phẩm trong giỏ hàng
      for (const item of user.cart.items) {
          const productId = item.product._id;
          const product = await Product.findById(productId);
          if (product) {
              // Cập nhật giá sản phẩm dựa trên item.variant1 và item.variant2
              if (item.variant1 && item.variant2) {
                  const selectedVariant1 = product.variant1.find(v => v._id.toString() === item.variant1._id.toString());
                  const variant1 = await Variant1.findById(selectedVariant1);
                  if (selectedVariant1) {
                      const selectedVariant2 = variant1.variant2.find(v => v._id.toString() === item.variant2._id.toString());
                      const variant2 = await Variant2.findById(selectedVariant2);
                      if (selectedVariant2) {
                          item.price = variant2.newVariant2Price;
                          if (item.quantity > variant2.stock)
                          {
                            item.quantity = variant2.stock
                          }
                      }
                  }
              } else if (item.variant1 && !item.variant2) {
                  const selectedVariant1 = product.variant1.find(v => v._id.toString() === item.variant1._id.toString());
                  const variant1 = await Variant1.findById(selectedVariant1);
                  if (selectedVariant1) {
                      item.price = variant1.newVariant1Price;
                      if (item.quantity > variant1.stock)
                      {
                          item.quantity = variant1.stock
                      }
                  }
              } else {
                  item.price = product.newPrice;
                  if (item.quantity > product.stock)
                  {
                        item.quantity = product.stock
                  }
              }
              // Cập nhật tổng giá trị
              total += item.price * item.quantity;
          }
      }
  
      // Cập nhật tổng giá trị của giỏ hàng
      user.cart.total = total;
      await user.cart.save();
    }
    let totalPoints = 0;
    for (let order of user.orders) {
      const orderDetails = await Order.findById(order);
        if (orderDetails && orderDetails.status === "Delivered") {
          const orderPoints = Math.floor(orderDetails.total / 1000);
          totalPoints += orderPoints;
        }
    }

    // Update user's VIP points and level
    user.vipStatus.points = totalPoints;
    const userLevel = calculateUserLevel(totalPoints, ranks);
    user.vipStatus.level = userLevel;
    await user.save();
    user = await User.findById(userId)
    .populate({
      path: "cart",
      select: "_id items total",
      populate: {
        path: "items.product items.variant1 items.variant2",// Đặt path tới trường chứa ID của sản phẩm trong items
      }
    }).populate({
      path: "orders",
      select: "_id items user total totalItem voucher taxFee shippingAddress shippingCost phoneNumber email paymentMethod status createDate modifyDate isSuccessReviewed orderCode", populate: {
        path: "user items.product", // Đặt path tới trường chứa ID của sản phẩm trong items
      }
    }).populate({
      path: "addresses",
      select: "address"
    }).populate("vipStatus.level").populate("vouchers");
    // Return user information with a "status" of "success"
    res.status(200).json({ status: 'success', data: user  });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', data: { message: 'Internal server error' } });
  }
};
//** ======================== Get all users ========================
const getAllAccounts = async (req, res) => {
  try {
    let data = await User.find().select("-password");
    const ranks = await Rank.find();
    
    for (let user of data) {
      let totalPoints = 0;

      for (let order of user.orders) {
        const orderDetails = await Order.findById(order);
        
        if (orderDetails.status === "Delivered") {
          const orderPoints = Math.floor(orderDetails.total / 1000);
          totalPoints += orderPoints;
        }
      }
      
      user.vipStatus.points = totalPoints;
      
      const userLevel = calculateUserLevel(totalPoints, ranks);
      
      user.vipStatus.level = userLevel;      
      await user.save();
    }
    
    data = await User.find().select("-password").populate("vipStatus.level").populate("vouchers");
    res.status(StatusCodes.OK).json({ status: "success", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', data: { message: 'Internal server error' } });
  }
};
//** ======================== Get single user ========================
const getSingleAccount = async (req, res) => {
  const { id: userId } = req.params
  const user = await User.findOne({ _id: userId }).select("-password")
  if (!user) {
    throw CustomError.NotFoundError("User does not exist")
  }
  checkPermissions(req.user, user._id)
  res.status(StatusCodes.OK).json({ user })
}

//** ======================== Show current user ========================
const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user })
}
//** ======================== DeleteOldImage========================
const deleteOldImage = async (oldImage) => {
  if (oldImage && oldImage.url) {
    const imagePath = oldImage.url.replace('http://localhost:5000/', ''); // Extract the local path from the URL

    try {
      // Delete the old image file
      await fs.unlink(imagePath);
      console.log(`Old image deleted: ${imagePath}`);
    } catch (error) {
      console.error(`Error deleting old image: ${error.message}`);
    }
  }
};
//** ======================== Update user ========================
const updateAccount = async (req, res) => {
  try {
    const image = req.file;
    const updatedData = req.body; // Updated data
    const userId = req.params.id

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: 'error', data: { message: 'User not found' } });
    }
    if (updatedData.email && updatedData.email !== user.email) {
      const existingUserWithSameEmail = await User.findOne({ email: updatedData.email });

      if (existingUserWithSameEmail) {
        return res.status(400).json({
          status: 'error',
          data: { message: 'Email already exists. Please choose a different one.' },
        });
      }
      user.email = updatedData.email
    }
    if (updatedData.role) {
      user.role = updatedData.role
    }
    if (updatedData.status) {
      user.status = updatedData.status
    }
    // If there's a new image, delete the old one and update the user's avatar
    if (image) {
      await deleteOldImage(user.avatar); // Delete old image
      const newImagePath = `public/uploads/${path.basename(image.path)}`;
      const imageData = { url: `http://localhost:5000/${newImagePath}` };
      user.avatar = imageData;
    }
    if (updatedData.vouchers && updatedData.vouchers.length > 0) {
      const newVoucherIds = updatedData.vouchers.split(',').map(voucherId => voucherId.trim());
      const oldVoucherIds = user.vouchers.map(voucherId => voucherId.toString());
      const vouchersToAdd = newVoucherIds.filter(voucherId => !oldVoucherIds.includes(voucherId));
      const vouchersToRemove = oldVoucherIds.filter(voucherId => !newVoucherIds.includes(voucherId));
      user.vouchers = user.vouchers.concat(vouchersToAdd);
      for (const voucherId of vouchersToRemove) {
        const index = user.vouchers.indexOf(voucherId);
        if (index !== -1) {
          user.vouchers.splice(index, 1);
        }
      }
    }
    user.modifyDate = format(new Date(), "HH:mm dd/MM/yyyy");
    await user.save();

    // Respond with the updated user
    res.status(StatusCodes.OK).json({ status: 'success', data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', data: { message: 'Internal server error' } });
  }
};

//** ======================== Update user password ========================
const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError("Please provide both values")
  }
  const user = await User.findOne({ _id: req.user.userId })
  const isPasswordCorrect = await user.comparePassword(oldPassword)
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("Wrong password provided")
  }
  user.password = newPassword
  await user.save()
  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated" })

}
// const updateUserStatus = async (req, res) => {
//   try {
//     const image = req.file;
//     const updatedData = req.body; // Updated data
//     const userId = req.params.id; // Assuming you pass the user ID to update through the URL

//     // Find the user by ID
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ status: 'error', data: { message: 'User not found' } });
//     }
//     if (updatedData.email && updatedData.email !== user.email) {
//       const existingUserWithSameEmail = await User.findOne({ email: updatedData.email });

//       if (existingUserWithSameEmail) {
//         return res.status(400).json({
//           status: 'error',
//           data: { message: 'Email already exists. Please choose a different one.' },
//         });
//       }
//     }
//     if (image) {
//       await deleteOldImage(user.avatar); // Delete old image
//       const newImagePath = `public/uploads/${path.basename(image.path)}`;
//       const imageData = { url: `http://localhost:5000/${newImagePath}` };
//       user.avatar = imageData;
//     }

//     // Update user status and other data
//     Object.assign(user, updatedData);

//     // Save the updated user
//     await user.save();

//     // Respond with the updated user
//     res.status(StatusCodes.OK).json({ status: 'success', data: { user } });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: 'error', data: { message: 'Internal server error' } });
//   }
// };
const deleteAccount = async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // Find the user by ID
    const user = await User.findById(userIdToDelete);

    if (!user) {
      return res.status(404).json({ status: 'error', data: { message: 'User not found' } });
    }

    // Find and delete the associated cart
    await Cart.deleteOne({ userId: userIdToDelete });

    // Perform any additional logic before deletion (if needed)
    // ...

    // Delete the user
    await user.remove();

    res.status(StatusCodes.OK).json({ status: 'success', data: { message: 'User and associated cart deleted successfully' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', data: { message: 'Internal server error' } });
  }
}

module.exports = {
  getCartandOrderByAccount,
  getAllAccounts,
  getSingleAccount,
  showCurrentUser,
  updateAccount,
  updateUserPassword,
  deleteAccount
}
