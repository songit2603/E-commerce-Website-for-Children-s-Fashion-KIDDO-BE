const express = require("express")
const router = express.Router()
const uploadI = require("../utils/upload")
const promotionMiddleware = require('../utils/promotionMiddleware');
const {
  createPromotion,
  getPromotionById,
  updatePromotion,
  removePromotionById,
  getAllPromotions,
  // deleteReview,
} = require("../controllers/promotionController")

const { authenticateUser,authorizePermissions } = require("../middleware/authentication")

router.route("/").post(authenticateUser,authorizePermissions("admin","employee"), uploadI.fields([{ name: 'banner', maxCount: 10 }, { name: 'frameStyle', maxCount: 10 }]),createPromotion).get(promotionMiddleware,getAllPromotions)

router.route("/:id").get(getPromotionById).patch(authenticateUser,authorizePermissions("admin","employee"), uploadI.fields([{ name: 'banner', maxCount: 10 }, { name: 'frameStyle', maxCount: 10 }]),updatePromotion).delete(authenticateUser,authorizePermissions("admin","employee"),removePromotionById)

//   .get(getSingleReview)
//   .patch(authenticateUser, updateReview)
//   .delete(authenticateUser, deleteReview)

module.exports = router