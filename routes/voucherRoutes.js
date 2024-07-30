const express = require("express")
const router = express.Router()
const uploadI = require("../utils/upload")
const {
  createVoucher,
  updateVoucher,
  getAllVouchers,
  getSingleVoucher,
  deleteVoucher,
  checkVoucher,
  addToCartVoucher
//   deleteRank
} = require("../controllers/voucherController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")


router
  .route("/check-voucher/")
  //.post(createCategory)
  .post(checkVoucher)

router
  .route("/add-to-cart-voucher/")
  //.post(createCategory)
  .post(addToCartVoucher)

router
  .route("/")
  //.post(createCategory)
  .post(authenticateUser,authorizePermissions("admin","employee"),uploadI.fields([{ name: 'imageVoucher', maxCount: 10 }]),createVoucher)
  .get(getAllVouchers)


router
  .route("/:id")
  .get(getSingleVoucher)
  .patch(authenticateUser,authorizePermissions("admin","employee"),uploadI.fields([{ name: 'imageVoucher', maxCount: 10 }]),updateVoucher)
  .delete(authenticateUser,authorizePermissions("admin","employee"),deleteVoucher)
// //   .patch([authenticateUser, authorizePermissions("admin employee")],updateCategory)
// //   .delete([authenticateUser, authorizePermissions("admin employee")], deleteCategory)

module.exports = router