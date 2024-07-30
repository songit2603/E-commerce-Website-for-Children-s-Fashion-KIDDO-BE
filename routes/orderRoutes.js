const express = require("express");
const router = express.Router();

const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication");

const {
  getAllOrders,
  getOrderById,
  getCurrentUserOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  vnPayCallback
} = require("../controllers/orderController");

// router
//   .route("/")
//   .post(authenticateUser, createOrder)
//   .get(authenticateUser, authorizePermissions("admin"), getAllOrders)
router.get('/vnpay_ipn', vnPayCallback);
router
  .route("/")
  .post(createOrder)
  .get(authenticateUser, authorizePermissions("admin", "employee"), getAllOrders);

// router.route("/:id").get(authenticateUser, getCurrentUserOrders)
router.route("/user/:id").get(getCurrentUserOrders);

// router
//   .route("/:id")
//   .get(authenticateUser, getOrderById)
//   .patch(authenticateUser, updateOrder)
router
  .route("/:id")
  .get(authenticateUser, authorizePermissions("admin","user","employee"), getOrderById)
  .patch(authenticateUser, authorizePermissions("admin", "user", "employee"), updateOrder)
  .delete(authenticateUser, authorizePermissions("admin", "employee"), deleteOrder);

module.exports = router;
