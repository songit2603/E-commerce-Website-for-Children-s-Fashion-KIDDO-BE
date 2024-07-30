const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const { StatusCodes } = require("http-status-codes")
const { format } = require("date-fns");
const moment = require('moment');
const getNotifications = async (req, res) => {
    try {
        const notification = await Notification.findOne(); // Lấy notification
        if (!notification) {
            return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }

        // Duyệt qua mỗi notification, lấy thông tin user từ ID trong details
        const notificationsWithUser = await Promise.all(notification.notificationsList.map(async (item) => {
            if (item.details && item.details.user) {
                const user = await User.findById(item.details.user);
                item.details.user = user; // Gán thông tin user vào item.details
            }
            if (item.statusProcess === 'process') {
                item.statusProcess = 'processed';
            }
            return item;
        }));

        // Thêm trường 'ago' cho mỗi thông báo dựa vào 'createDate'
        const notificationsWithAgo = notificationsWithUser.map(item => {
            const itemObject = item.toObject(); // Chuyển đổi Mongoose document thành plain JavaScript object
            itemObject.ago = moment(item.createDate, 'HH:mm DD/MM/YYYY').fromNow(); // Tính toán thời gian từ 'createDate' đến hiện tại
            return itemObject; // Trả về object mới có thêm trường 'ago'
        });

        // Tính toán số lượng thông báo theo trạng thái
        const counts = notificationsWithAgo.reduce((acc, item) => {
            if (item.statusProcess === 'no process') {
                acc.unprocessedNotifications += 1;
            } else {
                acc.processedNotifications += 1;
            }

            if (item.statusRead === 'unread') {
                acc.unreadNotifications += 1;
            } else {
                acc.readNotifications += 1;
            }

            return acc;
        }, { unprocessedNotifications: 0, processedNotifications: 0, unreadNotifications: 0, readNotifications: 0 });

        // Cập nhật số lượng vào đối tượng notification
        notification.unprocessedNotifications = counts.unprocessedNotifications;
        notification.processedNotifications = counts.processedNotifications;
        notification.unreadNotifications = counts.unreadNotifications;
        notification.readNotifications = counts.readNotifications;

        // Lưu các cập nhật vào cơ sở dữ liệu
        await notification.save();

        // Sắp xếp các thông báo theo 'createDate' từ mới nhất đến cũ nhất
        notificationsWithAgo.sort((a, b) => moment(b.createDate, 'HH:mm DD/MM/YYYY') - moment(a.createDate, 'HH:mm DD/MM/YYYY'));

        // Trả về kết quả với danh sách thông báo đã bao gồm trường 'ago' và thông tin user, cùng các số lượng mới cập nhật
        res.status(StatusCodes.OK).json({ status: 'success', data: {
            notificationsList: notificationsWithAgo,
            unprocessedNotifications: counts.unprocessedNotifications,
            processedNotifications: counts.processedNotifications,
            unreadNotifications: counts.unreadNotifications,
            readNotifications: counts.readNotifications
        } });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Lỗi khi lấy thông báo' });
    }
};
const updateNotificationStatus = async (req, res) => {
    try {
        const notificationId = req.params.id;
        const { statusRead, statusProcess } = req.body;

        // Tìm tài liệu notification chứa thông báo cần cập nhật
        const notification = await Notification.findOne();
        if (!notification) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Notification not found' });
        }

        // Tìm thông báo cụ thể bằng ID
        const item = notification.notificationsList.find(item => item._id.toString() === notificationId);
        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Notification item not found' });
        }

        // Cập nhật trạng thái đọc và xử lý
        if (statusRead && item.statusRead !== statusRead) {
            item.statusRead = statusRead;
            if (statusRead === 'read') {
                notification.unreadNotifications -= 1;
                notification.readNotifications += 1;
            } else if (statusRead === 'unread') {
                notification.readNotifications -= 1;
                notification.unreadNotifications += 1;
            }
        }

        if (statusProcess && item.statusProcess !== statusProcess) {
            item.statusProcess = statusProcess;
            if (statusProcess === 'processed') {
                notification.unprocessedNotifications -= 1;
                notification.processedNotifications += 1;
            } else if (statusProcess === 'no process') {
                notification.processedNotifications -= 1;
                notification.unprocessedNotifications += 1;
            }
        }

        // Cập nhật ngày sửa đổi
        item.modifyDate = format(new Date(), 'HH:mm dd/MM/yyyy');

        // Lưu thay đổi vào cơ sở dữ liệu
        await notification.save();

        // Lấy thông tin người dùng cho mỗi thông báo và thêm trường 'ago'
        const notificationsWithUser = await Promise.all(notification.notificationsList.map(async (item) => {
            if (item.details && item.details.user) {
                const user = await User.findById(item.details.user);
                item.details.user = user;
            }
            const itemObject = item.toObject();
            itemObject.ago = moment(item.createDate, 'HH:mm DD/MM/YYYY').fromNow();
            return itemObject;
        }));

        notificationsWithUser.sort((a, b) => moment(b.createDate, 'HH:mm DD/MM/YYYY') - moment(a.createDate, 'HH:mm DD/MM/YYYY'));

        // Trả về phản hồi thành công với định dạng giống hàm getNotifications
        res.status(StatusCodes.OK).json({ status: 'success', data: {
            notificationsList: notificationsWithUser,
            unprocessedNotifications: notification.unprocessedNotifications,
            processedNotifications: notification.processedNotifications,
            unreadNotifications: notification.unreadNotifications,
            readNotifications: notification.readNotifications
        } });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error updating notification' });
    }
};
module.exports = { getNotifications, updateNotificationStatus };