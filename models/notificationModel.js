const mongoose = require('mongoose');

const notificationItemSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Order', 'Review'],  // 'Order' hoặc 'Review' để xác định loại tham chiếu
  },
  statusRead: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread'
  },
  statusProcess: {
    type: String,
    enum: ['no process', 'processed'],
    default: 'no process'
  },
  details: {
    type: Object,
    default: {}
  },
  createDate: {
    type: String
  },
  modifyDate: {
    type: String
  }
});

const notificationSchema = new mongoose.Schema({
  notificationsList: [notificationItemSchema],
  unprocessedNotifications: {
    type: Number,
    default: 0
  },
  processedNotifications: {
    type: Number,
    default: 0
  },
  unreadNotifications: {
    type: Number,
    default: 0
  },
  readNotifications: {
    type: Number,
    default: 0
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;