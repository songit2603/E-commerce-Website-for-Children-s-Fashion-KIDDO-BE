const mongoose = require('mongoose');
const Product = require("../models/productModel");
const Variant2 = require("../models/variant2Model");
const { format } = require("date-fns");
const Variant1 = require("../models/variant1Model");
const CustomError = require("../errors");
const { StatusCodes } = require("http-status-codes");
const fs = require("fs");
const path = require("path");
const Review = require("../models/reviewModel");
const Notification = require("../models/notificationModel");
const Order = require("../models/orderModel");
const User = require('../models/userModel'); // Import model Sản phẩm
const ProductSnapshot = require('../models/productSnapshotModel');
const moment = require('moment');
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
const createReview = async (req, res) => {
  try {
    const {
      orderId,
      userId,
      productId,
      variant1Id,
      variant2Id,
      reviewContent,
      rating
    } = req.body;
    const imagesReview = req.files.imagesReview;
    const io = req.io;
    const order = await Order.findOne({_id: orderId, status: 'Delivered' })
    if (!order) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Không thể tạo review. Đơn hàng không tồn tại hoặc có trạng thái không hợp lệ.' });
    }
    // const order = await Order.findById(orderId);
    // if (!order) {
    //   return res.status(404).json({ status: 'error', data: { message: 'User not found' } });
    // }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', data: { message: 'User not found' } });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Sản phẩm không tồn tại' });
    }
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
      variant1: variant1Id || null,
      variant2: variant2Id || null,
    });

    if (existingReview) {
      // Cập nhật trạng thái isProductReviewed cho sản phẩm trong đơn hàng hiện tại
      for (const item of order.items) {
        const productSnapshotId = item.product;
        const productSnapshot = await ProductSnapshot.findById(productSnapshotId);
        if (productSnapshot && productId === productSnapshot.product.toString() &&
            (!variant1Id || item.variant1._id.toString() === variant1Id) &&
            (!variant2Id || item.variant2._id.toString() === variant2Id)) {
          item.isProductReviewed = true;
        }
      }
      await order.save();

      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Bạn đã đánh giá sản phẩm này.'
      });
    }
    let imageData = [];
    if (imagesReview && imagesReview.length > 0) {
    imageData = imagesReview.map((image) => {
      const imageName = path.basename(image.path);
      return {
        url: `http://localhost:5000/public/uploads/${path.basename(
          image.path
        )}`,
        name: imageName,
      };
    });
    }
    const review = new Review({
      order: orderId,
      user: userId,
      product: productId,
      variant1: variant1Id,
      variant2: variant2Id,
      reviewContent,
      rating,
      imagesReview: imageData,
    });
    review.createDate = format(new Date(), "HH:mm dd/MM/yyyy");
    review.modifyDate = format(new Date(), "HH:mm dd/MM/yyyy");
    review.isReviewed = true;
    await review.save();
    let existingNotification = await Notification.findOne();

    // Nếu không có bản ghi notification, tạo mới
    if (!existingNotification) {
      const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
      const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
      const newreviewNotify = new Notification({
        notificationsList: [{
          statusRead: 'unread', // Đánh dấu là chưa đọc
          statusProcess: 'no process',
          details: review, // Đánh dấu là chưa xử lý
          createDate: createDate,
          modifyDate: modifyDate,
          type: 'Review'
        }],
        unprocessedNotifications: 1,
        unreadNotifications: 1,
      });
      // Lưu bản ghi mới của orderNotify vào cơ sở dữ liệu
      await newreviewNotify.save();
      neworderNotify.notificationsList = addAgoFieldAndSortNotifications(neworderNotify.notificationsList);
      // Gửi bản ghi notification qua socket.io
      io.emit('reviewCreated', newreviewNotify);
    } else {
      const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
      const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
      // Nếu đã có bản ghi, cập nhật thông tin orderNotify
      existingNotification.notificationsList.push({
        statusRead: 'unread', // Đánh dấu là chưa đọc
        statusProcess: 'no process',
        details: review, // Đánh dấu là chưa xử lý
        createDate: createDate,
        modifyDate: modifyDate,
        type: 'Review'
      });
      existingNotification.unprocessedNotifications += 1;
      existingNotification.unreadNotifications += 1;
      // Lưu bản ghi cập nhật vào cơ sở dữ liệu
      await existingNotification.save();
      existingNotification.notificationsList = addAgoFieldAndSortNotifications(existingNotification.notificationsList);
      // Gửi bản ghi notification cập nhật qua socket.io
      io.emit('reviewCreated', existingNotification);
    }
    for (const item of order.items) {
      const productSnapshotId = item.product;
      const productSnapshot = await ProductSnapshot.findById(productSnapshotId);
      if (productSnapshot && productId === productSnapshot.product.toString() && (!variant1Id || item.variant1._id.toString() === variant1Id) && (!variant2Id || item.variant2._id.toString() === variant2Id))
      {
        if (!item.review) {
          item.review = {};
        }
        item.isProductReviewed = true;
        item.review = review._id;
        order.save();
      }
    }
    product.reviews.push(review)
    await product.save();
    user.reviews.push(review)
    await user.save();
    const allReviews = await Review.find({ product: productId });
    const ratingCounts = { fiveStar: 0, fourStar: 0, threeStar: 0, twoStar: 0, oneStar: 0 };
    allReviews.forEach(r => {
      if (r.rating === 5) ratingCounts.fiveStar++;
      else if (r.rating === 4) ratingCounts.fourStar++;
      else if (r.rating === 3) ratingCounts.threeStar++;
      else if (r.rating === 2) ratingCounts.twoStar++;
      else if (r.rating === 1) ratingCounts.oneStar++;
    });
    product.ratingCounts = ratingCounts;
    if (allReviews.length > 0) {
      const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = parseFloat((totalRating / allReviews.length).toFixed(1)); // Làm tròn đến 1 chữ số thập phân
    }
    product.averageRating = averageRating;
    await product.save();
    res.status(StatusCodes.CREATED).json({ review});
  } catch (error) {
    console.error(error.stack);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ status: "error", data: { message: "Lỗi server" } });
  }
};
const replyToReview = async (req, res) => {
  try {
    const reviewId = req.params.id
    const { userId, reply } = req.body;

    // Kiểm tra xem review có tồn tại không
    const review = await Review.findById(reviewId).populate("user product variant1 variant2 order");
    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Không tìm thấy review.' });
    }
    const user = await User.findById(userId);
    // Kiểm tra quyền hạn của người dùng, chỉ chủ cửa hàng mới có thể reply
    if (!user) {
      return res.status(404).json({ status: 'error', data: { message: 'User not found' } });
    }
    const createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    const modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    // Tạo phản hồi mới cho review
    review.reviewComments.push({ shopOwner: userId, reviewCommentContent: reply, createDate: createDate, modifyDate: modifyDate });
    await review.save();
    const notification = await Notification.findOne();
    if (notification) {
      let isUpdated = false;
      notification.notificationsList.forEach(notif => {
        if (notif.type === 'Review' && notif.details._id.toString() === reviewId.toString()) {
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
    res.status(StatusCodes.CREATED).json({ status: 'success', data: review});
  } catch (error) {
    throw new CustomError({
      message: error.message,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
};
const updateReply = async (req, res) => {
  try {
    const reviewId = req.params.id;  // Đảm bảo rằng bạn có đúng parameter từ route.
    const { userId, replyId, replyContent } = req.body;  // Giả sử replyId và nội dung mới được gửi trong body.

    // Kiểm tra xem đánh giá có tồn tại không
    const review = await Review.findById(reviewId).populate('user product variant1 variant2 order reviewComments.shopOwner');
    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Không tìm thấy review.' });
    }

    // Tìm phản hồi của user trong danh sách phản hồi của review dựa trên replyId
    const userReply = review.reviewComments.id(replyId);
    if (!userReply) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Không tìm thấy phản hồi.' });
    }

    // Kiểm tra xem người dùng hiện tại có phải là chủ sở hữu của phản hồi không
    if (userReply.shopOwner._id.toString() !== userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Bạn không có quyền cập nhật phản hồi này.' });
    }

    // Cập nhật nội dung phản hồi của user
    userReply.reviewCommentContent = replyContent;
    userReply.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    await review.save();

    res.status(StatusCodes.OK).json({ status: 'success', data: review});
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const deleteReply = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { userId, replyId } = req.body;

    // Tìm kiếm đánh giá
    const review = await Review.findById(reviewId).populate('user product variant1 variant2 order reviewComments.shopOwner');

    // Kiểm tra xem đánh giá có tồn tại không
    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Không tìm thấy đánh giá.' });
    }

    // Tìm kiếm phản hồi dựa trên id
    const reply = review.reviewComments.find(comment => comment._id.toString() === replyId);

    // Kiểm tra xem phản hồi có tồn tại không
    if (!reply) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Không tìm thấy phản hồi.' });
    }

    // Kiểm tra xem người dùng hiện tại khớp với người dùng đã tạo phản hồi không
    if (reply.shopOwner._id.toString() !== userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Bạn không có quyền xóa phản hồi này.' });
    }

    // Xóa phản hồi khỏi mảng reviewComments
    review.reviewComments.pull({ _id: replyId });

    // Lưu lại đánh giá đã cập nhật
    await review.save();

    res.status(StatusCodes.OK).json({ status: 'success', data: review});
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const updateReview = async (req, res) => {
  const reviewId = req.params.id; // Lấy ID của danh mục cần cập nhật
  const updatedData = req.body; // Dữ liệu cập nhật
  const imagesReview = req.files.imagesReview;
  const nameImagesReview = req.body.nameImagesReview;
  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ status: 'error', data: { message: 'Không tìm thấy đánh giá' } });
    }
    if (review.isUpdated === 1) {
      return res.status(400).json({
        status: 'error',
        data: { message: 'Không được phép cập nhật đánh giá' },
      });
    }
    const existingImages = review.imagesReview.map(image => image.name);
    if (imagesReview && imagesReview.length > 0) {
      const imageReviewData = imagesReview.map((image) => {
        const imageName = path.basename(image.path);
        return {
          url: `http://localhost:5000/public/uploads/${path.basename(
            image.path
          )}`,
          name: imageName,
        };
      });
    const oldImageUrls = review.imagesReview.map(image => image.url);
    const uniqueNewImageData = imageReviewData.filter(image => !oldImageUrls.includes(image.url));
    review.imagesReview = review.imagesReview.concat(uniqueNewImageData);
    const uploadDirectory = "./public/uploads";
    for (const existingName of existingImages) {
      // Kiểm tra nếu imageName không phải là mảng hoặc existingName không tồn tại trong imageName
      if (!nameImagesReview.includes(existingName)) {
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
          const index = review.imagesReview.findIndex(image => image.name === existingName);
          if (index !== -1) {
              review.imagesReview.splice(index, 1);
              console.log(`Đã xóa ảnh '${existingName}' từ mảng review.imagesReview.`);
          }
      }
    }
    }
    // Sử dụng toán tử spread (...) để cập nhật tất cả thuộc tính mới từ req.body
    Object.assign(review, updatedData);
    review.isUpdated = 1;
    review.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
    await review.save();
    res.json({ status: 'success', data: review });
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().populate('user product variant1 variant2 order reviewComments.shopOwner');
    res.status(StatusCodes.OK).json({ status: 'success', data: reviews});
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const getReviewByUserId= async (req, res) => {
  const userId = req.body;

  try {
    const reviews = await User.find({ _id: userId });
    
    if (!reviews) {
      res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `No reviews with the id ${userId}` } });
    } else {
      res.status(StatusCodes.OK).json({ status: 'success', data: reviews });
    }
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const getReviewByProductId = async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `No product with the id ${productId}` } });
    }

    let reviews = await Review.find({ product: productId }).populate("user product variant1 variant2 order reviewComments.shopOwner");

    if (!reviews) {
      return res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: `No reviews with the id ${productId}` } });
    }

    // Kiểm tra và cập nhật createDate và modifyDate cho mỗi review comment
    for (const review of reviews) {
      for (const comment of review.reviewComments) {
        if (!comment.createDate) {
          comment.createDate = format(new Date(), 'HH:mm dd/MM/yyyy');
        }
        if (!comment.modifyDate) {
          comment.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');
        }
      }
      await review.save();
    }

    res.status(StatusCodes.OK).json({ status: 'success', data: reviews });
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
const getReviewsWithoutReply = async (req, res) => {
  try {
    const reviewsWithoutReply = await Review.find({ reviewComments: { $exists: true, $eq: [] } })
                                            .populate('user product variant1 variant2 order');

    if (!reviewsWithoutReply || reviewsWithoutReply.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ status: 'error', data: { message: 'Không tìm thấy review nào chưa có phản hồi.' } });
    }

    res.status(StatusCodes.OK).json({ status: 'success', data: reviewsWithoutReply });
  } catch (error) {
    console.error(error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Lỗi server' } });
  }
};
module.exports = {
  createReview,
  replyToReview,
  updateReply,
  deleteReply,
  updateReview,
  getAllReviews,
  getReviewByUserId,
  getReviewByProductId,
  getReviewsWithoutReply
};
