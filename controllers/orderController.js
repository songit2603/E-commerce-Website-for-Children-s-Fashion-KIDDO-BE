const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const { StatusCodes } = require("http-status-codes");
const { format } = require('date-fns');  // Import the 'format' function from 'date-fns'
const Product = require('../models/productModel')
const User = require('../models/userModel')
const emailService = require('../utils/emailService');
const Variant1 = require('../models/variant1Model');
const Variant2 = require('../models/variant2Model');
const Voucher = require('../models/voucherModel');
const Notification = require('../models/notificationModel');
const ProductSnapshot = require('../models/productSnapshotModel')
const crypto = require('crypto');
const VNPayService = require('../utils/vnpayService')
const moment = require('moment');
const config = require('config');
const querystring = require('qs');
const c = require('config');
// Controller to get all order
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user')
      .populate('items.product')
      .populate('items.review');

    if (orders.length === 0) {
      return res.status(404).json({ status: 'error', data: { message: 'No orders found' } });
    }

    // Kiểm tra trạng thái isProductReviewed cho từng sản phẩm trong các đơn hàng
    for (const order of orders) {
      let allReviewed = true;
      for (const item of order.items) {
        if (!item.isProductReviewed) {
          allReviewed = false;
          break;
        }
      }
      order.isSuccessReviewed = allReviewed;
      await order.save();
    }

    res.status(200).json({ status: 'success', data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ status: 'error', data: { message: 'Internal Server Error' } });
  }
};
const addAgoFieldAndSortNotifications = (notifications) => {
  // Thêm trường 'ago' và chuyển đổi Mongoose document thành plain JavaScript object
  const updatedNotifications = notifications.map(item => {
    const itemObject = item.toObject();
    itemObject.ago = moment(item.createDate, 'HH:mm DD/MM/YYYY').fromNow();
    return itemObject;
  });

  // Sắp xếp các thông báo theo 'createDate' từ mới nhất đến cũ nhất
  updatedNotifications.sort((a, b) => moment(b.createDate, 'HH:mm DD/MM/YYYY').diff(moment(a.createDate, 'HH:mm DD/MM/YYYY')));

  return updatedNotifications;
};
// Controller to create a new order
const createOrder = async (req, res) => {
  const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
  try {
    const { userId, name, items, phoneNumber, email, voucherCode, totalItem, taxFee, shippingCost, shippingAddress, paymentMethod, total, voucherValue} = req.body;
    const io = req.io;
    let newOrder;
    const orderedItems = [];
    let totalNetProfit = 0;
    if (voucherCode) {
      const appliedVoucher = await Voucher.findOne({ code: voucherCode });
      if (!appliedVoucher) {
        return res.status(404).json({ status: 'error', data: { message: 'Voucher không hợp lệ' } });
      }
      if (!appliedVoucher.isActive) {
        return res.status(404).json({ status: 'error', data: { message: 'Voucher không khả dụng' } })
      }
      if (appliedVoucher.quantity = 0) {
        return res.status(404).json({ status: 'error', data: { message: 'Voucher đã đạt tới giới hạn cho phép, không thể dùng' } })
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
    }
    if (!userId) {
    for (const orderItem of items) {
      const product = await Product.findById(orderItem.product)
        .populate({
          path: 'variant1',
          populate: {
            path: 'variant2',
            select: '-stock' // Loại bỏ trường stock từ variant2
          },
          select: '-stock' // Loại bỏ trường stock từ variant1
        })
        .populate("category")
        .populate("brand")
        .select('-stock -orders -ordersCount -__v -averageRating -ratingCounts -reviews -totalSold -updatedAt -publishedDate -promotion -frameStyle -relatedProducts');// Loại bỏ trường stock từ product
        let variant1Name = "";
        let variant2Name = "";
        let variant1Id = "";
        let variant2Id = "";
        let netProfit = product.netProfit;
        if (orderItem.quantity <= 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({ status: 'error', data: { message: 'Số lượng mua phải lớn hơn 0' } });
        }
        const productCheck = await Product.findById(orderItem.product)
        // Kiểm tra số lượng tồn của sản phẩm chính
        if (!orderItem.variant1Id && !orderItem.variant2Id) {
          if (orderItem.quantity > productCheck.stock) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
          }
        }
        if (orderItem.variant1Id && orderItem.variant2Id) {
          const variant1 = await Variant1.findById(orderItem.variant1Id);
          const variant2 = await Variant2.findById(orderItem.variant2Id);
          if (!variant2) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Variant 2 không tồn tại' });
          }
          variant1Name = variant1.name;
          variant2Name = variant2.name;
          variant1Id = variant1._id;
          variant2Id = variant2._id;
          netProfit = variant2.netProfit;
          if (orderItem.quantity > variant2.stock) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
          }
        }
        // Kiểm tra số lượng tồn của variant 1 (nếu có)
        if (orderItem.variant1Id && !orderItem.variant2Id) {
          const variant1 = await Variant1.findById(orderItem.variant1Id);
          if (!variant1) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Variant 1 không tồn tại' });
          }
          variant1Name = variant1.name;
          variant1Id = variant1._id;
          netProfit = variant1.netProfit;
          if (orderItem.quantity > variant1.stock) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
          }
        }
        totalNetProfit += netProfit * orderItem.quantity;
        let allProductSnapshots = await ProductSnapshot.find({ 'product': product._id })
          let HashedData = '';
          if (product) {
              let existingProductData = JSON.stringify(product);
              const hash = crypto.createHash('sha256');
              hash.update(existingProductData);
              HashedData = hash.digest('hex');
          }
          
          // Tìm snapshot trùng khớp nếu có
          const matchedSnapshot = allProductSnapshots.find(snapshot => {
              let existingProductSnapshotData = JSON.stringify(snapshot.data);
              const hash = crypto.createHash('sha256');
              hash.update(existingProductSnapshotData);
              let existingHashedData = hash.digest('hex');
              return existingHashedData === HashedData;
          });
          
          if (matchedSnapshot) {
              if (orderItem.variant1Id && orderItem.variant2Id) {
                  orderedItems.push({
                      product: matchedSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                      variant2: {
                          _id: variant2Id,
                          name: variant2Name
                      },
                  });
              } else if (orderItem.variant1Id && !orderItem.variant2Id) {
                  orderedItems.push({
                      product: matchedSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                  });
              } else {
                  orderedItems.push({
                      product: matchedSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                  });
              }
          } else {
              const productSnapshot = new ProductSnapshot({
                  product: product._id,
                  data: { ...product.toObject() },
              });
              await productSnapshot.save();
              if (orderItem.variant1Id && orderItem.variant2Id) {
                  orderedItems.push({
                      product: productSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                      variant2: {
                          _id: variant2Id,
                          name: variant2Name
                      },
                  });
              } else if (orderItem.variant1Id && !orderItem.variant2Id) {
                  orderedItems.push({
                      product: productSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                  });
              } else {
                  orderedItems.push({
                      product: productSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                  });
              }
          }
      }
      newOrder = new Order({
        name,
        items: orderedItems,
        phoneNumber,
        email,
        total,
        totalItem,
        taxFee,
        shippingCost,
        voucher: voucherCode,
        email,
        shippingAddress,
        paymentMethod,
        createDate,
        modifyDate,
        totalNetProfit: totalNetProfit,
        voucherValue
      });
    } else {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Người dùng không tồn tại' });
      }

      // Check the user's status before allowing them to place an order
      if (user.status !== 'active') {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Tài khoản không hoạt động' });
      }
      for (const orderItem of items) {
        const product = await Product.findById(orderItem.product)
        .populate({
          path: 'variant1',
          populate: {
            path: 'variant2',
            select: '-stock' // Loại bỏ trường stock từ variant2
          },
          select: '-stock' // Loại bỏ trường stock từ variant1
        })
        .populate("category")
        .populate("brand")
        .select('-stock -orders -ordersCount -__v -averageRating -ratingCounts -reviews -totalSold -updatedAt -publishedDate -promotion -frameStyle -relatedProducts'); // Loại bỏ trường stock từ product
        let variant1Name = "";
        let variant2Name = "";
        let variant1Id = "";
        let variant2Id = "";
        let netProfit = product.netProfit;
        if (orderItem.quantity <= 0) {
          return res.status(400).json({ status: 'error', message: 'Số lượng mua phải lớn hơn 0' });
        }
        const productCheck = await Product.findById(orderItem.product)
        // Kiểm tra số lượng tồn của sản phẩm chính
        if (!orderItem.variant1Id && !orderItem.variant2Id) {
          if (orderItem.quantity > productCheck.stock) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
          }
        }
        // Kiểm tra số lượng tồn của variant 1 (nếu có)
        if (orderItem.variant1Id && !orderItem.variant2Id) {
          const variant1 = await Variant1.findById(orderItem.variant1Id);
          variant1Name = variant1.name;
          variant1Id = variant1._id;
          netProfit = variant1.netProfit;
          if (variant1 && orderItem.quantity > variant1.stock) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
          }
        }
        
        // Kiểm tra số lượng tồn của variant 2 (nếu có)
        if (orderItem.variant1Id && orderItem.variant2Id) {
          const variant1 = await Variant1.findById(orderItem.variant1Id);
          const variant2 = await Variant2.findById(orderItem.variant2Id);
          variant1Name = variant1.name;
          variant2Name = variant2.name;
          variant1Id = variant1._id;
          variant2Id = variant2._id;
          netProfit = variant2.netProfit;
          if (variant2 && orderItem.quantity > variant2.stock) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Số lượng tồn không đủ' });
          }
        }
        totalNetProfit += netProfit * orderItem.quantity;
        let allProductSnapshots = await ProductSnapshot.find({ 'product': product._id })
          let HashedData = '';
          if (product) {
              let existingProductData = JSON.stringify(product);
              const hash = crypto.createHash('sha256');
              hash.update(existingProductData);
              HashedData = hash.digest('hex');
          }
          
          // Tìm snapshot trùng khớp nếu có
          const matchedSnapshot = allProductSnapshots.find(snapshot => {
              let existingProductSnapshotData = JSON.stringify(snapshot.data);
              const hash = crypto.createHash('sha256');
              hash.update(existingProductSnapshotData);
              let existingHashedData = hash.digest('hex');
              return existingHashedData === HashedData;
          });
          
          if (matchedSnapshot) {
              if (orderItem.variant1Id && orderItem.variant2Id) {
                  orderedItems.push({
                      product: matchedSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                      variant2: {
                          _id: variant2Id,
                          name: variant2Name
                      },
                  });
              } else if (orderItem.variant1Id && !orderItem.variant2Id) {
                  orderedItems.push({
                      product: matchedSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                  });
              } else {
                  orderedItems.push({
                      product: matchedSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                  });
              }
          } else {
              const productSnapshot = new ProductSnapshot({
                  product: product._id,
                  data: { ...product.toObject() },
                  createdAt: format(new Date(), 'HH:mm dd/MM/yyyy')
              });
              await productSnapshot.save();
              if (orderItem.variant1Id && orderItem.variant2Id) {
                  orderedItems.push({
                      product: productSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                      variant2: {
                          _id: variant2Id,
                          name: variant2Name
                      },
                  });
              } else if (orderItem.variant1Id && !orderItem.variant2Id) {
                  orderedItems.push({
                      product: productSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                      variant1: {
                          _id: variant1Id,
                          name: variant1Name
                      },
                  });
              } else {
                  orderedItems.push({
                      product: productSnapshot._id,
                      quantity: orderItem.quantity,
                      price: orderItem.price,
                  });
              }
          }
      }
      newOrder = new Order({
        user: userId,
        name: user.name,
        items: orderedItems,
        phoneNumber,
        total,
        totalItem,
        taxFee,
        shippingCost,
        voucher: voucherCode,
        email,
        shippingAddress,
        paymentMethod,
        createDate,
        modifyDate,
        totalNetProfit: totalNetProfit,
        voucherValue
      });
      const userCart = await Cart.findOne({ user: userId });
      if (userCart) {
        // Lấy ID sản phẩm gốc từ các ProductSnapshot trong đơn hàng
        const orderedProductDetails = await Promise.all(newOrder.items.map(async (item) => {
            const snapshot = await ProductSnapshot.findById(item.product);
            if (!snapshot) {
                throw new Error(`ProductSnapshot not found for product ID: ${item.product}`);
            }
            return {
                productId: snapshot.product, // Lấy ID sản phẩm gốc
                variant1Id: item.variant1 ? item.variant1._id : null,
                variant2Id: item.variant2 ? item.variant2._id : null
            };
        }));
    
        // Lọc ra các sản phẩm trong giỏ hàng không có trong danh sách sản phẩm đã đặt
        const updatedCartItems = userCart.items.filter(cartItem => {
            return !orderedProductDetails.some(orderedItem => {
                if (orderedItem.productId.equals(cartItem.product)) {
                    if (orderedItem.variant1Id && orderedItem.variant2Id) {
                        return orderedItem.variant1Id.equals(cartItem.variant1) &&
                               orderedItem.variant2Id.equals(cartItem.variant2);
                    } else if (orderedItem.variant1Id && !orderedItem.variant2Id) {
                        return orderedItem.variant1Id.equals(cartItem.variant1) &&
                               !cartItem.variant2;
                    } else if (!orderedItem.variant1Id && !orderedItem.variant2Id) {
                        return !cartItem.variant1 && !cartItem.variant2;
                    }
                }
                return false;
            });
        });
    
        // Cập nhật giỏ hàng
        userCart.items = updatedCartItems;
        userCart.total = updatedCartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        await userCart.save();
    } else {
        console.log('Không tìm thấy giỏ hàng để xóa.');
    }
    }
    const order = await newOrder.save();
    if (voucherCode && voucherCode !== "") {
      const appliedVoucher = await Voucher.findOne({ code: voucherCode });
      // Cập nhật số lần sử dụng sau khi áp dụng voucher
      const userIndex = appliedVoucher.usedByUsers.findIndex(user => user.userId.toString() === userId);
      if (userIndex !== -1) {
          appliedVoucher.usedByUsers[userIndex].usesCount++;
      } else {
          appliedVoucher.usedByUsers.push({ userId: userId, usesCount: 1 });
      }
      // Cập nhật số lần sử dụng voucher
      appliedVoucher.quantity -= 1;
      await appliedVoucher.save();

      const user = await User.findOneAndUpdate(
        { _id: userId },
        { $pull: { vouchers: appliedVoucher._id } }, // Xóa voucher từ danh sách vouchers của người dùng
        { new: true }
      );
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Người dùng không tồn tại' });
      }
    }
    let existingNotification = await Notification.findOne();

    // Nếu không có bản ghi notification, tạo mới
    if (!existingNotification) {
      // Tạo và lưu thông báo mới
      const neworderNotify = new Notification({
        notificationsList: [{
          statusRead: 'unread',
          statusProcess: 'no process',
          details: order,
          createDate: format(new Date(), 'HH:mm dd/MM/yyyy'),
          modifyDate: format(new Date(), 'HH:mm dd/MM/yyyy'),
          type: 'Order',
        }],
        unprocessedNotifications: 1,
        unreadNotifications: 1,
      });
      await neworderNotify.save();
    
      neworderNotify.notificationsList = addAgoFieldAndSortNotifications(neworderNotify.notificationsList);
      
      io.emit('orderCreated', neworderNotify);
    } else {
      // Cập nhật thông báo hiện có
      existingNotification.notificationsList.push({
        statusRead: 'unread',
        statusProcess: 'no process',
        details: order,
        createDate: format(new Date(), 'HH:mm dd/MM/yyyy'),
        modifyDate: format(new Date(), 'HH:mm dd/MM/yyyy'),
        type: 'Order',
      });
      existingNotification.unprocessedNotifications += 1;
      existingNotification.unreadNotifications += 1;
    
      await existingNotification.save();
    
      existingNotification.notificationsList = addAgoFieldAndSortNotifications(existingNotification.notificationsList);
      
      io.emit('orderCreated', existingNotification);
    }
    // Iterate through each item in the order and update the corresponding product
    for (const orderItem of order.items) {
      const productSnapshot = await ProductSnapshot.findById(orderItem.product);
      const product = await Product.findById(productSnapshot.product);
      if (product) {
          if (orderItem.variant2 && orderItem.variant2._id != null && orderItem.variant2.name != null) {
              const variant2 = await Variant2.findById(orderItem.variant2);
              if (variant2) {
                  variant2.stock -= orderItem.quantity;
                  await variant2.save();
              }
          } else if (orderItem.variant1 && orderItem.variant1._id != null && orderItem.variant1.name != null) {
              const variant1 = await Variant1.findById(orderItem.variant1);
              if (variant1) {
                  variant1.stock -= orderItem.quantity;
                  await variant1.save();
              }
          }
          product.totalSold += orderItem.quantity;
          // Trừ số lượng tồn kho của sản phẩm chính
          product.stock -= orderItem.quantity;
          await product.save();
  
          // Thêm đơn hàng vào danh sách đơn hàng của sản phẩm
          product.orders.push(order);
          // Tăng số lượng đơn hàng của sản phẩm lên 1
          product.ordersCount += 1;
          // Lưu lại thông tin sản phẩm sau khi đã cập nhật
          await product.save();
      }
    }
    if (userId) {
      const updateUser = await User.findByIdAndUpdate(
        userId,
        { $push: { orders: order._id } }, // Assuming "orders" is the field in the User model that references orders
        { new: true }
      );

      if (!updateUser) {
        return res.status(500).json({ status: 'error', data: { message: 'Failed to update user with the order' } });
      }
    }
    if(newOrder.email) {
      emailService.sendOrderConfirmationEmail(newOrder);
    }
    if (paymentMethod === 'VNPay') {
      // Đảm bảo rằng newOrder đã được khởi tạo và có _id hợp lệ
      if (!newOrder || !newOrder._id) {
          return res.status(400).json({ message: "Đơn hàng không tồn tại hoặc chưa được tạo." });
      }
      // Định dạng lại createDate để đảm bảo đúng format yêu cầu của VNPay
      let date = new Date();
      let createDate = moment(date).format('YYYYMMDDHHmmss'); // Sử dụng thư viện date-fns hoặc tương tự để định dạng ngày
      const paymentData = {
          amount: total, // Tổng số tiền của đơn hàng
          orderId: newOrder.orderCode, // ID của đơn hàng mới tạo
          description: 'Thanh toan cho ma GD:' + newOrder.orderCode, // Mô tả đơn hàng
          ipAddress: req.ip, // IP của khách hàng đặt hàng
          createDate: createDate // Ngày giờ tạo đơn hàng theo định dạng VNPay
      };
      // Gọi hàm generateVNPayUrl từ service VNPay để tạo URL thanh toán
      const redirectUrl = VNPayService.generateVNPayUrl(paymentData);
      // Lưu URL này vào đơn hàng để sử dụng sau này
      newOrder.redirectUrl = redirectUrl;
      // Nếu bạn lưu đơn hàng vào cơ sở dữ liệu tại đây, hãy đảm bảo rằng URL được cập nhật
      await newOrder.save();
      return res.json({ status: 'success', data: {redirectUrl:redirectUrl} });
    }
    res.status(201).json({ status: 'success', data: order});
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ status: 'error', data: { message: 'Internal Server Error' } });
  }
};
// Controller to get a specific order by ID
const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('user').populate('items.product').populate('items.variant1._id').populate('items.variant2._id').populate('items.review')

    if (!order) {
      return res.status(404).json({ status: 'error', data: { message: 'Order not found' } });
    }
    let allReviewed = true;
      for (const item of order.items) {
        if (!item.isProductReviewed) {
          allReviewed = false;
          break;
        }
      }
      order.isSuccessReviewed = allReviewed;
      await order.save();
    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ status: 'error', data: { message: 'Internal Server Error' } });
  }
};
const getCurrentUserOrders = async (req, res) => {
  try {
    // Assuming you have a way to identify the current user, such as from the authentication middleware
    const userId = req.params.id;

    const userOrders = await Order.find({ user: userId }).populate('items.product');

    res.json(userOrders);
  } catch (error) {
    console.error('Error fetching current user order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Controller to update an existing order
const updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { phoneNumber, email, voucher, totalItem, taxFee, shippingCost, shippingAddress, paymentMethod, total, status } = req.body;

    // Use ISO format for the modified date
    const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');

    // Check if the order exists
    const existingOrder = await Order.findById(orderId);

    if (!existingOrder) {
      return res.status(404).json({ status: 'error', data: { message: 'Order not found' } });
    }
    if (existingOrder.status === 'Cancelled' || existingOrder.status === 'Returns') {
      return res.status(400).json({ status: 'error', data: { message: 'Cannot modify a cancelled order' } });
    }
    if (existingOrder.paymentMethod === 'VNPay' && existingOrder.paymentStatus === 'Pending') {
      return res.status(400).json({ status: 'error', data: { message: 'Cannot change status for VNPay orders with Pending payment' } });
    }
    if (status === 'Cancelled' && existingOrder.status !== 'Pending') {
      return res.status(400).json({ status: 'error', data: { message: 'Cannot cancel an order that is not in "Pending" status' } });
    }
    if (existingOrder.status === 'Delivered') {
      return res.status(400).json({ status: 'error', data: { message: 'Cannot change the status of a delivered order' } });
    }
    // Create an object with fields to update
    const updateFields = {
      phoneNumber,
      email,
      voucher,
      totalItem,
      taxFee,
      shippingCost,
      shippingAddress,
      paymentMethod,
      total,
      status,
      modifyDate,
    };
    if (existingOrder.paymentMethod === 'COD' && status === 'Delivered') {
      updateFields.paymentStatus = 'Paid'; // Set paymentStatus to Paid
    }
    // Update the order without userId and name

    if (status === 'Cancelled' && existingOrder.status !== 'Cancelled' || status === 'Returns' && existingOrder.status !== 'Returns') {
      updateFields.paymentStatus = 'Fail';
      // Handle order cancellation logic here

      // Refund product quantities
      for (const item of existingOrder.items) {
        const productSnapshot = await ProductSnapshot.findById(item.product);
        const product = await Product.findById(productSnapshot.product);
        if (item.variant2 && item.variant2._id != null && item.variant2.name != null) {
          const variant2 = await Variant2.findById(item.variant2);
          if (variant2) {
              variant2.stock += item.quantity;
              await variant2.save();
          }
        } else if (item.variant1 && item.variant1._id != null && item.variant1.name != null) {
          const variant1 = await Variant1.findById(item.variant1);
          if (variant1) {
              variant1.stock += item.quantity;
              await variant1.save();
          }
        }
          // Refund the quantity for each product
          product.stock += item.quantity;
          product.totalSold -= item.quantity;
          product.orders.pull(orderId);
          product.ordersCount -= 1;
          await product.save();
      }
    }
    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateFields, { new: true }).populate('items.product user');
    const notification = await Notification.findOne();
    if (notification) {
      let isUpdated = false;
      notification.notificationsList.forEach(notif => {
        if (notif.type === 'Order' && notif.details._id.toString() === orderId.toString()) {
          if (notif.statusProcess !== 'processed') {  // Chỉ cập nhật nếu trạng thái hiện tại là chưa xử lý
            notif.statusProcess = 'processed';
            notification.processedNotifications += 1;
            notification.unprocessedNotifications -= 1;
            isUpdated = true;
          }
          if (notif.statusRead !== 'read') {  // Chỉ cập nhật nếu trạng thái hiện tại là chưa xử lý
            notif.statusRead = 'read';
            notification.readNotifications += 1;
            notification.unreadNotifications -= 1;
            isUpdated = true;
          }
        }
      });

      if (isUpdated) {
        await notification.save();
      }
    }
    // Fetch the updated order with populated items
    // Note: If needed, you can populate specific fields here
    res.status(200).json({ status: 'success', data: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ status: 'error', data: { message: 'Internal Server Error' } });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Check if the order exists
    const existingOrder = await Order.findById(orderId);

    if (!existingOrder) {
      return res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: 'Order not found' } });
    }
    if (existingOrder.status !== 'Cancelled') {
      return res.status(StatusCodes.BAD_REQUEST).json({ status: 'error', data: { message: 'Only orders with status "Cancelled" can be deleted' } });
    }

    // Iterate through each item in the order and update the corresponding product
    // for (const orderItem of existingOrder.items) {
    //   const product = await Product.findById(orderItem.product);

    //   if (product) {
    //     // Remove the association with the order from the product
    //     product.orders.pull(orderId);
    //     product.ordersCount -= 1;
    //     await product.save();
    //   }
    // }

    // Check if the order has an associated user
    if (existingOrder.user) {
      // Remove the associated order from the user's orders array
      const updateUser = await User.findByIdAndUpdate(
        existingOrder.user,
        { $pull: { orders: orderId } },
        { new: true }
      );

      if (!updateUser) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Failed to update user' } });
      }
    }

    // Delete the order
    await existingOrder.remove();

    res.status(StatusCodes.OK).json({ status: 'success', data: { message: 'Delete order success' } });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Internal Server Error' } });
  }
};
function sortObject(obj) {
  let sorted = {};
let str = [];
let key;
for (key in obj){
  if (obj.hasOwnProperty(key)) {
  str.push(encodeURIComponent(key));
  }
}
str.sort();
  for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}
const vnPayCallback = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    const secretKey = config.get('vnp_HashSecret');
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const checkSum = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    if (secureHash === checkSum) {
      const orderCode = vnp_Params['vnp_TxnRef'];
      const resultCode = vnp_Params['vnp_ResponseCode'];

      // Giả định bạn đã cập nhật trạng thái trong CSDL tại đây, ví dụ: paymentStatus = '1' hoặc '2'
      if (resultCode === '00') {
        const order = await Order.findOne({ orderCode: orderCode });
        if (order) {
          order.paymentStatus = 'Paid';
          order.status = 'Confirmed';
          await order.save();
          res.status(200).json({RspCode: '00', Message: 'Success'});
        } else {
          res.status(404).json({RspCode: '01', Message: 'Order not found'});
        } 
      }
      else {
        const order = await Order.findOne({ orderCode: orderCode });
        order.paymentStatus = 'Failed';
        // Cập nhật trạng thái giao dịch thanh toán thất bại vào CSDL của bạn
        res.status(200).json({RspCode: resultCode, Message: 'Failure'});
      }
    } else {
      res.status(500).json({RspCode: '97', Message: 'Checksum failed'});
    }
  } catch (error) {
    console.error('Error processing VNPay callback:', error);
    res.status(500).json({status: 'error', message: 'Internal Server Error'});
  }
};
const cancelUnpaidVNPayOrders = async () => {
  try {
      const currentTime = new Date(); // Thời gian hiện tại

      // Tìm các đơn hàng có paymentMethod là VNPay và chưa được thanh toán
      const orders = await Order.find({
        paymentMethod: 'VNPay',
        paymentStatus: { 
            $ne: 'Paid',
            $ne: 'Failed' // Thêm điều kiện này để loại bỏ các đơn hàng có paymentStatus là 'Failed'
        }
      });

      // Lọc các đơn hàng đã quá 1 ngày mà chưa thanh toán
      const ordersToCancel = orders.filter(order => {
          const orderCreateDate = moment(order.createDate, 'HH:mm DD/MM/yyyy').toDate();
          const oneDayAfterCreateDate = moment(orderCreateDate).add(1, 'day').toDate();
          return currentTime > oneDayAfterCreateDate;
      });
      // Hủy các đơn hàng chưa thanh toán và cập nhật trạng thái sản phẩm
      for (const order of ordersToCancel) {
          order.status = 'Cancelled';
          order.paymentStatus = 'Failed';
          await order.save();

          // Refund product quantities
          for (const item of order.items) {
              const productSnapshot = await ProductSnapshot.findById(item.product);
              const product = await Product.findById(productSnapshot.product);
              if (item.variant2 && item.variant2._id != null && item.variant2.name != null) {
                  const variant2 = await Variant2.findById(item.variant2);
                  if (variant2) {
                      variant2.stock += item.quantity;
                      await variant2.save();
                  }
              } else if (item.variant1 && item.variant1._id != null && item.variant1.name != null) {
                  const variant1 = await Variant1.findById(item.variant1);
                  if (variant1) {
                      variant1.stock += item.quantity;
                      await variant1.save();
                  }
              }
              product.stock += item.quantity;
              product.totalSold -= item.quantity;
              product.orders.pull(order._id);
              product.ordersCount -= 1;
              await product.save();
          }

          // Cập nhật thông báo
          const notification = await Notification.findOne();
          if (notification) {
              notification.notificationsList.forEach(notif => {
                  if (notif.type === 'Order' && notif.details._id.toString() === order._id.toString()) {
                      if (notif.statusProcess !== 'processed') {
                          notif.statusProcess = 'processed';
                          notification.processedNotifications += 1;
                          notification.unprocessedNotifications -= 1;
                      }
                      if (notif.statusRead !== 'read') {
                          notif.statusRead = 'read';
                          notification.readNotifications += 1;
                          notification.unreadNotifications -= 1;
                      }
                  }
              });
              await notification.save();
          }
      }

      console.log(`Processed ${ordersToCancel.length} unpaid VNPay orders and cancelled them.`);
  } catch (error) {
      console.error('Error cancelling unpaid VNPay orders:', error);
  }
}
module.exports = {
  getAllOrders,
  createOrder,
  getOrderById,
  getCurrentUserOrders,
  updateOrder,
  deleteOrder, 
  vnPayCallback,
  cancelUnpaidVNPayOrders
  // Add other exported controllers here
};
