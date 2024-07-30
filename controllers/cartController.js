const Cart = require('../models/cartModel'); // Import model Giỏ hàng
const Product = require('../models/productModel'); // Import model Sản phẩm
const Variant1 = require('../models/variant1Model'); // Import model Sản phẩm
const Variant2 = require('../models/variant2Model'); // Import model Sản phẩm
const User = require('../models/userModel'); // Import model Sản phẩm
const { StatusCodes } = require("http-status-codes")
// Lấy giỏ hàng của người dùng
const getCart = async (req, res) => {
  try {
    const { userId } = req.body;

    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart) {
      return res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: 'Giỏ hàng không tồn tại' } });
    }

    res.status(StatusCodes.OK).json({ status: 'success', data: cart });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};

// Thêm sản phẩm vào giỏ hàng
const addToCart = async (req, res) => {
    try {
      const { userId } = req.body;
      const { productId, variant1Id, variant2Id, quantity } = req.body;
  
      // Tìm sản phẩm dựa trên productId
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Sản phẩm không tồn tại' });
      }
      if (quantity > product.stock) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
      }
      // Tạo một mục mới cho giỏ hàng
      let price = 0;

    // Nếu có variant2, tìm giá trị price dựa trên variant1 và variant2
    if (variant1Id && variant2Id) {
        const selectedVariant1 = product.variant1.find(v => v._id.toString() === variant1Id)
        const variant1 = await Variant1.findById(selectedVariant1);
        if (variant1) {
            // Sử dụng một hàm lambda để tìm selectedVariant
            const selectedVariant2 = variant1.variant2.find(v => v._id.toString() === variant2Id);
            const variant2 = await Variant2.findById(selectedVariant2);
            // Kiểm tra selectedVariant và cập nhật giá
            if (variant2) {
                price = variant2.newVariant2Price;
                if (quantity > variant2.stock) {
                  return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ cho biến thể sản phẩm' });
              }
            }
      }
    }
    // Nếu không có variant2, kiểm tra variant1
    else if (variant1Id && !variant2Id) {
      const selectedVariant1 = product.variant1.find(c => c._id.toString() === variant1Id);
      const variant1 = await Variant1.findById(selectedVariant1);
        if (variant1) {
            price = variant1.newVariant1Price;
            if (quantity > variant1.stock) {
              return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ cho biến thể sản phẩm' });
            }
        }
    }

    // Nếu price vẫn bằng 0, thì sử dụng giá trị mặc định từ product
    if (!variant1Id && !variant2Id)  {
        price = product.newPrice;
    }
    // Tìm giỏ hàng của người dùng dựa trên userId
    let cart = await Cart.findOne({ user: userId });
  
    if (!cart) {
      cart = new Cart({
          user: userId,
          items: [],
          total: 0,
      });
  }
  
  // Kiểm tra xem mục giỏ hàng đã tồn tại chưa
  let existingCartItemIndex = -1;
  if (variant1Id && variant2Id) {
      existingCartItemIndex = cart.items.findIndex(item =>
          item.product.toString() === productId &&
          item.variant1.toString() === variant1Id &&
          item.variant2.toString() === variant2Id
      );
  } else if (variant1Id && !variant2Id) {
      existingCartItemIndex = cart.items.findIndex(item =>
          item.product.toString() === productId &&
          item.variant1.toString() === variant1Id &&
          !item.variant2
      );
  } else {
      existingCartItemIndex = cart.items.findIndex(item =>
          item.product.toString() === productId &&
          !item.variant1 &&
          !item.variant2
      );
  }
  
  if (existingCartItemIndex !== -1) {
      const existingCartItem = cart.items[existingCartItemIndex];
      let updatedQuantity = existingCartItem.quantity + quantity;
      
      // Kiểm tra xem có biến thể variant1 và variant2 hay không
      if (variant1Id && variant2Id) {
          // Lấy biến thể variant1 và variant2 từ sản phẩm
          const selectedVariant1 = product.variant1.find(v => v._id.toString() === variant1Id)
          const variant1 = await Variant1.findById(selectedVariant1);
          if (variant1) {
              // Sử dụng một hàm lambda để tìm selectedVariant
              const selectedVariant2 = variant1.variant2.find(v => v._id.toString() === variant2Id);
              const variant2 = await Variant2.findById(selectedVariant2);
              // Kiểm tra selectedVariant và cập nhật số lượng
              if (variant2) {
                  // Kiểm tra xem số lượng mới sau khi cộng có lớn hơn số lượng tồn không
                  if (updatedQuantity > variant2.stock) {
                      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ cho biến thể sản phẩm' });
                  }
              }
          }
      } else if (variant1Id && !variant2Id) {
          // Lấy biến thể variant1 từ sản phẩm
          const selectedVariant1 = product.variant1.find(c => c._id.toString() === variant1Id);
          const variant1 = await Variant1.findById(selectedVariant1);
          if (variant1) {
              // Kiểm tra xem số lượng mới sau khi cộng có lớn hơn số lượng tồn không
              if (updatedQuantity > variant1.stock) {
                  return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ cho biến thể sản phẩm' });
              }
          }
      } else {
          // Kiểm tra xem số lượng mới sau khi cộng có lớn hơn số lượng tồn không
          if (updatedQuantity > product.stock) {
              return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
          }
      }

      // Mục giỏ hàng đã tồn tại và các biến thể giống nhau, cập nhật số lượng
      cart.items[existingCartItemIndex].quantity = updatedQuantity;
      cart.items[existingCartItemIndex].price = price;
    } else {
      // Mục giỏ hàng chưa tồn tại hoặc các biến thể khác nhau, thêm mục mới
      cart.items.push({
          product: productId,
          variant1: variant1Id,
          variant2: variant2Id,
          quantity,
          price,
      });
  }
  
      // Cập nhật tổng giá trị giỏ hàng
      cart.total = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
  
      // Lưu giỏ hàng
      await cart.save();
      await User.findByIdAndUpdate(
        userId,
        { $set: { cart: cart._id } }, // Assuming cart field in User model references the Cart model
        { new: true }
      );
  
      res.status(StatusCodes.OK).json({ status: 'success', data: cart });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
  };
const updateCart = async (req, res) => {
    try {
        const { userId, productId, quantity, variant1Id, variant2Id } = req.body;

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ message: 'Giỏ hàng không tồn tại' });
        }

        let existingItemIndex = -1;

        // Trường hợp có cả variant1 và variant2
        if (variant1Id && variant2Id) {
            existingItemIndex = cart.items.findIndex(
                (cartItem) => cartItem.product.toString() === productId &&
                               cartItem.variant1.toString() === variant1Id &&
                               cartItem.variant2.toString() === variant2Id
            );
        }
        // Trường hợp chỉ có variant1
        else if (variant1Id && !variant2Id) {
            existingItemIndex = cart.items.findIndex(
                (cartItem) => cartItem.product.toString() === productId &&
                               cartItem.variant1.toString() === variant1Id &&
                               !cartItem.variant2
            );
        }
        // Trường hợp không có cả variant1 và variant2
        else {
            existingItemIndex = cart.items.findIndex(
                (cartItem) => cartItem.product.toString() === productId &&
                               !cartItem.variant1 &&
                               !cartItem.variant2
            );
        }

        if (existingItemIndex !== -1) {
            const product = await Product.findById(productId);
            if (variant1Id && variant2Id) {
              const variant2 = await Variant2.findById(variant2Id);
              // Kiểm tra selectedVariant và cập nhật giá
              if (variant2) {
                  if (quantity > variant2.stock) {
                    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ cho biến thể sản phẩm' });
                }
              }
            }
            if (variant1Id && !variant2Id) {
              const variant1= await Variant1.findById(variant1Id);
              // Kiểm tra selectedVariant và cập nhật giá
              if (variant1) {
                  if (quantity > variant1.stock) {
                    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ cho biến thể sản phẩm' });
                }
              }
            }
            if (quantity > product.stock) {
                return res.status(400).json({ message: 'Số lượng cần cập nhật vượt quá số lượng tồn' });
            }
            // Update the quantity of the specified product
            cart.items[existingItemIndex].quantity = quantity;
        } else {
            return res.status(404).json({ message: 'Sản phẩm không tồn tại trong giỏ hàng' });
        }

        // Tính toán lại tổng giá trị giỏ hàng
        cart.total = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

        // Lưu giỏ hàng sau khi cập nhật
        await cart.save();

        res.status(StatusCodes.OK).json({ status: 'success', data: cart });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};
  // Xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = async (req, res) => {
    try {
        const { userId, productId, variant1Id, variant2Id } = req.body;

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ message: 'Giỏ hàng không tồn tại' });
        }

        let existingItemIndex = -1;

        // Trường hợp có cả variant1 và variant2
        if (variant1Id && variant2Id) {
            existingItemIndex = cart.items.findIndex(
                (cartItem) => cartItem.product.toString() === productId &&
                               cartItem.variant1.toString() === variant1Id &&
                               cartItem.variant2.toString() === variant2Id
            );
        }
        // Trường hợp chỉ có variant1
        else if (variant1Id && !variant2Id) {
            existingItemIndex = cart.items.findIndex(
                (cartItem) => cartItem.product.toString() === productId &&
                               cartItem.variant1.toString() === variant1Id &&
                               (!cartItem.variant2 || cartItem.variant2 === "")
            );
        }
        // Trường hợp không có cả variant1 và variant2
        else {
            existingItemIndex = cart.items.findIndex(
                (cartItem) => cartItem.product.toString() === productId &&
                               (!cartItem.variant1 || cartItem.variant1 === "") &&
                               (!cartItem.variant2 || cartItem.variant2 === "")
            );
        }

        if (existingItemIndex === -1) {
            return res.status(404).json({ message: 'Sản phẩm không tồn tại trong giỏ hàng' });
        }

        // Xóa sản phẩm khỏi giỏ hàng
        cart.items.splice(existingItemIndex, 1);

        // Tính toán lại tổng giá trị giỏ hàng
        cart.total = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

        // Lưu giỏ hàng sau khi xóa sản phẩm
        await cart.save();

        res.status(StatusCodes.OK).json({ status: 'success', data: cart });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCart,
    removeFromCart
  }
