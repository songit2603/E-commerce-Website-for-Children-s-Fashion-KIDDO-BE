const express = require("express")
const router = express.Router()
const uploadI = require("../utils/upload")
const {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
} = require("../controllers/productController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")
const promotionMiddleware = require('../utils/promotionMiddleware');

router
  .route("/")
  //.post(uploadI.array("images"),createProduct)
  .post(authenticateUser,authorizePermissions("admin","employee"), uploadI.fields([{ name: 'images', maxCount: 10 }, { name: 'imagesVariant', maxCount: 10 }]),createProduct)
  .get(getAllProducts)

router
  .route("/uploadImage")
  //.post(uploadImage)
  .post([authenticateUser, authorizePermissions("admin")], uploadImage)

router
  .route("/:id")
  .get(getSingleProduct)
  .patch(authenticateUser,authorizePermissions("admin","employee"),uploadI.fields([{ name: 'images', maxCount: 10 }, { name: 'imagesVariant', maxCount: 10 }]),updateProduct)
  .delete(authenticateUser,authorizePermissions("admin","employee"),deleteProduct)

router
  .route("/image/:id")
  //.put([authenticateUser, authorizePermissions("admin")], uploadI.array("images", 4),updateProduct)
  //.delete([authenticateUser, authorizePermissions("admin")], deleteProduct)


module.exports = router
