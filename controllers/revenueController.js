const { StatusCodes } = require("http-status-codes");
const Order = require('../models/orderModel');
const Revenue = require('../models/revenueModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Variant1 = require('../models/variant1Model'); 
const Variant2 = require('../models/variant2Model');
const { format, startOfDay, endOfDay, parse, isWithinInterval } = require("date-fns");
const moment = require('moment');
const calculateMetricsNew = (revenueDetails) => {
    const totalOrders = revenueDetails.reduce((total, detail) => total + detail.totalOrders, 0);
    const totalNetProfit = revenueDetails.reduce((total, detail) => total + detail.totalNetProfit, 0);
    const totalCancelledOrders = revenueDetails.reduce((total, detail) => total + detail.totalCancelledOrders, 0);
    
    // Tính tổng doanh thu dựa trên tỷ lệ phần trăm lợi nhuận và lợi nhuận ròng từng ngày
    const totalRevenue = revenueDetails.reduce((total, detail) => {
      if (detail.percentNetProfit !== "0%") {
        const percent = parseFloat(detail.percentNetProfit.replace('%', '')) / 100;
        return total + (detail.totalNetProfit / percent);
      }
      return total;
    }, 0);
    
    // Tính phần trăm lợi nhuận trung bình
    const averageProfitPercentage = totalRevenue !== 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%';
  return {
    totalOrders,
    totalNetProfit,
    totalCancelledOrders,
    averageProfitPercentage
  };
};
const getRevenue = async (req, res) => {
    const { startDate, endDate } = req.body;
    try {
    const startDateTime = moment(startDate, "DD/MM/YYYY").startOf('day').toDate();
    const endDateTime = moment(endDate, "DD/MM/YYYY").endOf('day').toDate();
    console.log(startDateTime)
    console.log(endDateTime)
    const datesOfPeriod = [];
        for (let date = moment(startDateTime).clone(); date <= endDateTime; date.add(1, 'day')) {
            datesOfPeriod.push(date.format('DD/MM/YYYY'));
    }
    const orders = await Order.find();
    const orderInDatePeriod = orders.filter(order => {
        const createDate = moment(order.createDate, 'HH:mm DD/MM/YYYY')
        return createDate >= startDateTime && createDate <= endDateTime;
    });
    const dailyDetailsPeriod = [];

    for (const date of datesOfPeriod) {
        const dailyOrder = orderInDatePeriod.filter(order => moment(order.createDate, 'HH:mm DD/MM/YYYY').format('DD/MM/YYYY') === date);
        const deliveredOrdersToday = dailyOrder.filter(order => order.status === 'Delivered');
        const totalNetProfitPeriod = deliveredOrdersToday.reduce((total, order) => total + order.totalNetProfit, 0);
        const totalOrdersPeriod = dailyOrder.length;
        const totalOrdersCancelledPeriod = dailyOrder.filter(order => order.status === 'Cancelled').length;
        const totalRevenuePeriod = deliveredOrdersToday.reduce((total, order) => total + order.totalItem, 0);
        // Tạo đối tượng chi tiết doanh thu cho mỗi ngày và đẩy vào mảng
        const dailyDetail = {
            date: date,
            totalNetProfit: totalNetProfitPeriod,
            totalOrders: totalOrdersPeriod,
            totalCancelledOrders: totalOrdersCancelledPeriod,
            totalRevenue: totalRevenuePeriod,
            percentNetProfit: totalRevenuePeriod !== 0 ? ((totalNetProfitPeriod / totalRevenuePeriod) * 100).toFixed(2) + '%' : '0%'
        };

        // Đẩy đối tượng vào mảng
        dailyDetailsPeriod.push(dailyDetail);
    }
    const calculateRevenueForPeriod = (dailyDetails, start, end) => {
        // Tính toán số ngày thực tế có trong khoảng thời gian
        const actualDays = moment(end).diff(start, 'days') + 1; // +1 để bao gồm cả ngày cuối cùng
    
        // Tính toán các ngày trước đó
        const sevenDaysAgo = moment(end).subtract(Math.min(actualDays, 7), 'days').toDate();
        const fifteenDaysAgo = moment(end).subtract(Math.min(actualDays, 15), 'days').toDate();
        const thirtyDaysAgo = moment(end).subtract(Math.min(actualDays, 30), 'days').toDate();
    
        // Lọc dữ liệu dựa trên các khoảng thời gian
        const sevenDayRevenue = dailyDetails.filter(detail => {
            const detailDate = moment(detail.date, 'DD/MM/YYYY').toDate();
            return detailDate >= sevenDaysAgo && detailDate <= end;
        });
    
        const fifteenDayRevenue = dailyDetails.filter(detail => {
            const detailDate = moment(detail.date, 'DD/MM/YYYY').toDate();
            return detailDate >= fifteenDaysAgo && detailDate <= end;
        });
    
        const thirtyDayRevenue = dailyDetails.filter(detail => {
            const detailDate = moment(detail.date, 'DD/MM/YYYY').toDate();
            return detailDate >= thirtyDaysAgo && detailDate <= end;
        });
    
        return {
            sevenDayRevenue: {
                metrics: calculateMetricsNew(sevenDayRevenue),
                data: sevenDayRevenue
            },
            fifteenDayRevenue: {
                metrics: calculateMetricsNew(fifteenDayRevenue),
                data: fifteenDayRevenue
            },
            thirtyDayRevenue: {
                metrics: calculateMetricsNew(thirtyDayRevenue),
                data: thirtyDayRevenue
            }
        };
    };
    const { sevenDayRevenue, fifteenDayRevenue, thirtyDayRevenue } = calculateRevenueForPeriod(dailyDetailsPeriod, startDateTime, endDateTime);
    const transformRevenueDataToChartFormat = (revenueData) => {
        let ordersData = [];
        let revenueDataPoints = [];
        let cancelledData = [];
        let dateLabelData =[];
        // Lặp qua các ngày và tính toán tổng cho mỗi loại
        revenueData.forEach((dayDetail) => {
            ordersData.push(dayDetail.totalOrders);
            revenueDataPoints.push(dayDetail.totalNetProfit);
            cancelledData.push(dayDetail.totalCancelledOrders);
            const day = moment(dayDetail.date, 'DD/MM/YYYY').format('DD/MM');
            dateLabelData.push(day)
        });
        
        // Tính tổng các giá trị từ mảng revenueDetails
        const totalOrders = revenueData.reduce((total, detail) => total + detail.totalOrders, 0);
        const totalNetProfit = revenueData.reduce((total, detail) => total + detail.totalNetProfit, 0);
        const totalCancelledOrders = revenueData.reduce((total, detail) => total + detail.totalCancelledOrders, 0);
        
        // Tính tổng doanh thu dựa trên tỷ lệ phần trăm lợi nhuận và lợi nhuận ròng từng ngày
        const totalRevenue = revenueData.reduce((total, detail) => {
            if (detail.percentNetProfit !== "0%") {
                const percent = parseFloat(detail.percentNetProfit.replace('%', '')) / 100;
                return total + (detail.totalNetProfit / percent);
            }
            return total;
        }, 0);
        const averageProfit = totalRevenue !== 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
        // Tạo đối tượng biểu đồ cho mỗi loại
        return {
            chart: [
                { name: "Đơn đặt hàng", type: "area", data: ordersData },
                { name: "Thu về", type: "bar", data: revenueDataPoints },
                { name: "Hoàn lại", type: "line", data: cancelledData },
                { name: "Ngày", data: dateLabelData}
            ],
            data: {
                totalOrders: totalOrders,
                totalNetProfit: totalNetProfit,
                totalCancelledOrders: totalCancelledOrders,
                averageProfitPercentage: averageProfit,
            }
        }
    };

    // Sử dụng hàm này để tạo dữ liệu cho biểu đồ từ các khoảng thời gian thu nhập
    const sevenDayRevenueChart = transformRevenueDataToChartFormat(sevenDayRevenue.data);
    const fifteenDayRevenueChart = transformRevenueDataToChartFormat(fifteenDayRevenue.data);
    const thirtyDayRevenueChart = transformRevenueDataToChartFormat(thirtyDayRevenue.data);
    //---------------------------------------------------------------
    const currentDate = new Date();


    let existingRevenueRecord = await Revenue.findOne();
    if (!existingRevenueRecord) {
      // Nếu không tìm thấy bản ghi doanh số cho tháng hiện tại, tạo một bản ghi mới
      existingRevenueRecord = new Revenue({
          totalUsers: 0, // Thêm giá trị mặc định cho trường totalUsers
          totalOrders: 0, // Thêm giá trị mặc định cho trường totalOrders
          totalRevenue: 0,
          totalNetProfit: 0,
          totalDiscount: 0,
          dailyDetails: []
      });
    }
    // Lưu cập nhật vào cơ sở dữ liệu
    await existingRevenueRecord.save();
    // ================================================================ 
    const successOrders = await Order.find({ 
        status: 'Delivered',
    });
    const filterSuccessOrders = successOrders.filter(order => {
        // Chuyển đổi startDate từ chuỗi sang đối tượng Date
        const createDateTime = moment(order.createDate, 'HH:mm DD/MM/YYYY').toDate();
        // So sánh startDate với currentTime
        return startDateTime <= createDateTime && endDateTime > createDateTime;
    });
    const totalRevenue = filterSuccessOrders.reduce((total, order) => total + order.totalItem, 0);
    const totalNetProfit = filterSuccessOrders.reduce((total, order) => total + order.totalNetProfit, 0);
    const totalDiscount = filterSuccessOrders.reduce((total, order) => total + order.voucherValue, 0);
    const totalOrders = filterSuccessOrders.length;
    const allUsers = await User.find({ role: 'user' }).select('-password');
    const filterUsers = allUsers.filter(order => {
        // Chuyển đổi startDate từ chuỗi sang đối tượng Date
        const createDateTime = moment(order.createDate, 'HH:mm DD/MM/YYYY').toDate();
        // So sánh startDate với currentTime
        return startDateTime <= createDateTime && endDateTime > createDateTime;
    });
    existingRevenueRecord.totalRevenue = totalRevenue;
    existingRevenueRecord.totalOrders = totalOrders;
    existingRevenueRecord.totalUsers = allUsers.length;
    existingRevenueRecord.totalNetProfit = totalNetProfit;
    existingRevenueRecord.totalDiscount = totalDiscount;
    existingRevenueRecord.users = allUsers.map(user => user._id);
    // ================================================================ 
    const getTopSellingProductsForPeriod = async (startDate, endDate) => {
        const start = moment(startDate).startOf('day').toDate();// Định dạng startDate thành ngày bắt đầu của ngày
        const end = moment(endDate).endOf('day').toDate();
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
            { $match: { 'productDetails._id': { $exists: true }, 'productDetails.createdAt': { $exists: true } } },
            { $lookup: {
                from: 'products', // Assume 'products' is the name of the collection where the original products with stock are stored
                localField: 'productDetails.product',
                foreignField: '_id',
                as: 'originalProductDetails'
            }},
            { $unwind: '$originalProductDetails' },
            // Thực hiện lookup của variant1 trong productDetails
            {
                $addFields: {
                    variant1Details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$productDetails.data.variant1',
                                    cond: { $eq: ['$$this._id', '$items.variant1._id'] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            { $unwind: { path: '$variant1Details', preserveNullAndEmptyArrays: true } },
            // Thực hiện lookup của variant2 trong productDetails
            {
                $addFields: {
                    variant2Details: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$variant1Details.variant2",
                                    as: "variant2",
                                    cond: { $eq: ["$$variant2._id", "$items.variant2._id"] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            { $unwind: { path: '$variant2Details', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: {
                        product: '$productDetails._id', 
                        variant1: '$variant1Details._id',
                        variant2: '$variant2Details._id'
                    },
                    totalQuantity: { $sum: '$items.quantity' },
                    productDetails: { $addToSet: '$productDetails' },
                    createdAt: { $addToSet: '$productDetails.createdAt' },
                    originalProductDetails: { $first: '$originalProductDetails' },
                    variant1Details: { $first: '$variant1Details' },
                    variant2Details: { $first: '$variant2Details' },
                    netProfit: { 
                        $sum: {
                            $cond: [
                                { $eq: [{ $type: "$variant2Details" }, "missing"] },
                                { $cond: [
                                    { $eq: [{ $type: "$variant1Details" }, "missing"] },
                                    { $multiply: ["$productDetails.data.netProfit", '$items.quantity'] },
                                    { $multiply: ["$variant1Details.netProfit", '$items.quantity'] }
                                ]},
                                { $multiply: ["$variant2Details.netProfit", '$items.quantity'] }
                            ]
                        }
                    }
                }
            },
            { $addFields: { netProfit: { $ifNull: ["$netProfit", 0] } }},
            { $sort: { totalQuantity: -1 }},
            { $limit: 10 },
        ]);
        return topSellingProducts.flatMap(item => 
            item.productDetails.map(detail => ({
                product: detail.data,
                createdAt: detail.createdAt,
                variant1: item.variant1Details,
                variant2: item.variant2Details,
                totalQuantity: item.totalQuantity,
                totalNetProfit: item.netProfit,
                stock: item.originalProductDetails.stock
            }))
        );
    };
    const topSellingToday = await getTopSellingProductsForPeriod(endDateTime, endDateTime);
    const topSellingLast7Days = await getTopSellingProductsForPeriod(moment(endDateTime).subtract(7, 'days').toDate(), endDateTime);
    const topSellingLast15Days = await getTopSellingProductsForPeriod(moment(endDateTime).subtract(15, 'days').toDate(), endDateTime);
    const topSellingLast30Days = await getTopSellingProductsForPeriod(moment(endDateTime).subtract(30, 'days').toDate(), endDateTime);
    // ================================================================ 
    const allOrders = await Order.find().populate('user').populate('items.product');
    const filterRecentOrders = allOrders.filter(order => {
        // Chuyển đổi startDate từ chuỗi sang đối tượng Date
        const createDateTime = moment(order.createDate, 'HH:mm DD/MM/YYYY').toDate();
        // So sánh startDate với currentTime
        return startDateTime <= createDateTime && endDateTime > createDateTime;
    });
    // Sắp xếp tất cả các đơn hàng theo khoảng cách thời gian tới currentDate
    filterRecentOrders.sort((a, b) => {
        const createDateA = moment(a.createDate, 'HH:mm DD/MM/YYYY').toDate();
        const createDateB = moment(b.createDate, 'HH:mm DD/MM/YYYY').toDate();
        return Math.abs(currentDate.getTime() - createDateA.getTime()) - Math.abs(currentDate.getTime() - createDateB.getTime());
    });

    // Lấy ra 5 đơn hàng gần nhất
    const nearestOrders = filterRecentOrders.slice(0, 5);

    existingRevenueRecord.recentOrders = nearestOrders;
    existingRevenueRecord.timestamp = format(new Date(), "HH:mm dd/MM/yyyy");

    await existingRevenueRecord.save();
    // ================================================================
    const ordersWithNegativeProfit = await Order.find({ status: 'Delivered', totalNetProfit: { $lt: 0 } })
                                                   .populate('user')
                                                   .populate('items.product');
    const ordersWithNegativeProfitInTime = ordersWithNegativeProfit.filter(order => {
        const createDate = moment(order.createDate, 'HH:mm DD/MM/YYYY')
        return createDate >= startDateTime && createDate <= endDateTime;
    });
    // Sắp xếp danh sách ordersWithNegativeProfit
    ordersWithNegativeProfitInTime.sort((a, b) => {
        const createDateA = moment(a.createDate, 'HH:mm DD/MM/YYYY').toDate();
        const createDateB = moment(b.createDate, 'HH:mm DD/MM/YYYY').toDate();
        return Math.abs(currentDate.getTime() - createDateA.getTime()) - Math.abs(currentDate.getTime() - createDateB.getTime());
    });
    // ================================================================ 

    // ================================================================ 
    const ordersByStatus = {};
    filterRecentOrders.forEach(order => {
            if (!ordersByStatus[order.status]) {
                ordersByStatus[order.status] = 1;
            } else {
                ordersByStatus[order.status]++;
            }
    });
    const statusLabels = ['Delivered', 'Pending', 'Confirmed', 'Pickups', 'Shipped', 'Returns', 'Cancelled'];

    // Khởi tạo mảng series và mảng labels
    const series = [];
    const labels = [];

    // Lặp qua danh sách các trạng thái
    statusLabels.forEach(status => {
        // Kiểm tra xem trạng thái hiện tại có trong dữ liệu ordersByStatus không
        if (ordersByStatus.hasOwnProperty(status)) {
            // Nếu có, đẩy số lượng đơn hàng vào mảng series và nhãn vào mảng labels
            series.push(ordersByStatus[status]);
            labels.push(status);
        } else {
            // Nếu không, đẩy số 0 vào mảng series và nhãn vào mảng labels
            series.push(0);
            labels.push(status);
        }
    });

    // Chuẩn bị đối tượng response cho biểu đồ donut
    const donutChart = {
        series,
        labels
    };
  
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {existingRevenueRecord,
      topSellingToday,
      topSellingLast7Days,
      topSellingLast15Days,
      topSellingLast30Days,
      sevenDayRevenueChart,
      fifteenDayRevenueChart,
      thirtyDayRevenueChart,
      donutChart,
      ordersWithNegativeProfitInTime}
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ status: 'error', data: { message: 'Internal Server Error' } });
  }
};

module.exports = {
  getRevenue
};