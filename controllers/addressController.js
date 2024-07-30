const Address = require('../models/addressModel');
const User = require('../models/userModel');
const { format } = require('date-fns');
const { StatusCodes } = require("http-status-codes");

const createAddress = async (req, res) => {
    let { userId, shippingAddress, name, phoneNumber, email, isDefault } = req.body; // Assuming userId is provided in the request body
    const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  
    try {
      const normalizedAddress = shippingAddress.trim().toLowerCase();
      const existingAddresses = await Address.find({ user: userId });
  
      const matchingAddress = existingAddresses.find(existingAddress => {
        const normalizedExistingAddress = existingAddress.shippingAddress.trim().toLowerCase();
        return normalizedExistingAddress === normalizedAddress;
      });
  
      if (matchingAddress) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          data: { message: 'Address with the same name already exists.' },
        });
      }
      if (existingAddresses.length === 0) {
        isDefault = true;
      }
      else {
        if (isDefault === true) {
          // Find all addresses of the same user
          await Address.updateMany(
              { user: userId, isDefault: true },
              { isDefault: false }
          );
        }
      }
      const newAddress = new Address({
        shippingAddress,
        name,
        phoneNumber,
        createDate,
        modifyDate,
        user: userId, // Set the user field to the ID of the corresponding user
        email,
        isDefault: isDefault,
      });
  
      await newAddress.save();
      const user = await User.findById(userId);
        if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            status: 'error',
            data: { message: 'User not found.' },
        });
        }
        user.addresses.push(newAddress);
        await user.save();
      res.status(StatusCodes.CREATED).json({ status: 'success', data: newAddress });
    } catch (error) {
      console.error(error.stack);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        data: { message: 'Internal Server Error' },
      });
    }
};
const getAddressesByUserId = async (req, res) => {
  const userId = req.params.id;

  try {
    // Tìm người dùng theo userId và populate địa chỉ
    const user = await User.findById(userId).populate('addresses');

    // Kiểm tra nếu người dùng không tồn tại
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        data: { message: 'User not found.' },
      });
    }

    let needsUpdate = false;

    // Cập nhật địa chỉ nếu chưa có trường isDefault
    for (const address of user.addresses) {
      if (!address.isDefault) {
        // Tìm và cập nhật địa chỉ thực tế trong cơ sở dữ liệu
        address.isDefault = false; // hoặc giá trị mặc định khác nếu cần
        needsUpdate = true;
      }
      if (needsUpdate) {
        await address.save();
      }
    }
    const sortedAddresses = user.addresses.sort((a, b) => b.isDefault - a.isDefault);
    // Trả về các địa chỉ liên quan đến người dùng
    res.status(StatusCodes.OK).json({ status: 'success', data: sortedAddresses  });
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      data: { message: 'Internal Server Error' },
    });
  }
};
// const getAddressByAddressId = async (req, res) => {
//   const addressId = req.params.id;

// try {
//   // Find the user by userId
//   const address = await Address.findById(addressId).populate('user');

//   // Check if the user exists
//   if (!address) {
//     return res.status(StatusCodes.NOT_FOUND).json({
//       status: 'error',
//       data: { message: 'Address not found.' },
//     });
//   }

//   // Return the addresses associated with the user
//   res.status(StatusCodes.CREATED).json({ status: 'success', data: address });
// } catch (error) {
//   console.error(error.stack);
//   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//     status: 'error',
//     data: { message: 'Internal Server Error' },
//   });
// }
// };
const updateAddressById = async (req, res) => {
  const addressId = req.params.id; // Get the ID of the address to update
  const updatedData = req.body; // Updated data

  try {
      const address = await Address.findById(addressId).populate("user");
      if (!address) {
          return res.status(404).json({
              status: 'error',
              data: { message: 'Address not found.' },
          });
      }

      // If the updated data includes setting isDefault to true, update other addresses
      if (updatedData.isDefault === true) {
          // Find all addresses of the same user
          const userId = address.user;
          console.log(userId)
          await Address.updateMany(
              { user: userId, isDefault: true, _id: { $ne: addressId } },
              { isDefault: false }
          );
      }

      // Use the spread operator (...) to update all new properties from req.body
      Object.assign(address, updatedData);

      // Update modifyDate
      address.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
      await address.save();

      res.json({ status: 'success', data: address });
  } catch (error) {
      console.error(error.stack);
      res.status(500).json({
          status: 'error',
          data: { message: 'Internal Server Error' },
      });
  }
};
const deleteAddress = async (req, res) => {
  const userId = req.params.userId;
  const addressId = req.params.addressId;

  if (!addressId) {
    return res.status(400).json({ status: 'error', data: { message: 'Missing addressId in request body' } });
  }

  try {
    // Remove the address from the Address collection
    const address = await Address.findByIdAndRemove(addressId);

    if (!address) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy địa chỉ' } });
    }

    // Pull the address ID from the addresses field in the User model // Assuming you have the userId in req.user

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { addresses: addressId } }, // Remove the addressId from the addresses array in the User model
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy người dùng' }});
    }
    if (updatedUser.addresses.length === 1) {
      const remainingAddress = await Address.findById(updatedUser.addresses[0]);
      if (remainingAddress) {
        remainingAddress.isDefault = true;
        await remainingAddress.save();
      }
    }

    res.json({ status: 'success', data: { message: 'Địa chỉ đã bị xóa' }, address: addressId  });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
module.exports = {
    createAddress,
    getAddressesByUserId,
    // getAddressByAddressId,
    updateAddressById,
    deleteAddress
  }