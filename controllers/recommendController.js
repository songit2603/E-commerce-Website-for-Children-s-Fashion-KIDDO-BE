const { StatusCodes } = require("http-status-codes");
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const { format, startOfDay, endOfDay, parse, isWithinInterval } = require("date-fns");
const moment = require('moment');

const getRecommendProductTopSelling = async (req, res) => {
    const currentDate = new Date();
    const start = moment(currentDate).subtract(30, 'days').startOf('day').toDate(); // Ngày bắt đầu là ngày hiện tại trừ đi 30 ngày
    const end = moment(currentDate).endOf('day').toDate(); // Ngày kết thúc là ngày hiện tại

    try {
        const topSellingProducts = await Order.aggregate([
            {
                $addFields: {
                    convertedCreateDate: {
                        $subtract: [
                            {
                                $dateFromString: {
                                    dateString: '$createDate',
                                    format: "%H:%M %d/%m/%Y"
                                }
                            },
                            25200000 // Số mili giây tương ứng với sự chênh lệch múi giờ giữa UTC và múi giờ của Việt Nam (UTC+7)
                        ]
                    }
                }
            },
            { $match: { convertedCreateDate: { $gte: start, $lte: end }, status: 'Delivered' }},
            { $unwind: '$items' },
            { $lookup: {
                from: 'productsnapshots',
                localField: 'items.product',
                foreignField: '_id',
                as: 'productDetails'
            }},
            { $unwind: '$productDetails' },
            { $group: { _id: '$productDetails.product', totalQuantity: { $sum: '$items.quantity' } }},
            { $sort: { totalQuantity: -1 }},
            { $limit: 10 },
            { $project: { _id: 1, totalQuantity: 1 } } // Chỉ lấy trường _id và totalQuantity
        ]);
        console.log(topSellingProducts)
        const topSellingProductIds = topSellingProducts.map(item => item._id);
        const topSellingProductIdsString = topSellingProductIds.map(id => id.toString());
        const topSellingProductsDetails = await Product.find({ _id: { $in: topSellingProductIdsString } });

        // Sắp xếp lại topSellingProductsDetails theo thứ tự của topSellingProductIdsString
        const sortedTopSellingProductsDetails = topSellingProductIdsString.map(id => topSellingProductsDetails.find(product => product._id.toString() === id));

        res.json({ status: 'success', data: sortedTopSellingProductsDetails });
    } catch (error) {
        console.error(error.stack);
        res.status(500).json({ status: 'error', data: { message: 'Lỗi server' } });
    }
};

module.exports = { getRecommendProductTopSelling };