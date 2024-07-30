const { removeExpiredPromotions,applyDiscountForOngoingPromotions } = require('../controllers/promotionController');
const { cancelUnpaidVNPayOrders } = require('../controllers/orderController');
const promotionMiddleware = async (req, res, next) => {
    try {
        // Kiểm tra và xóa các khuyến mãi hết hạn
        await applyDiscountForOngoingPromotions();
        await removeExpiredPromotions();
        await cancelUnpaidVNPayOrders();
        next();
    } catch (error) {
        console.error('Error checking expired promotions:', error);
        next(error);
    }
};

module.exports = promotionMiddleware;