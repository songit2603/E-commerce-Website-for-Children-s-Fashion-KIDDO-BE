const express = require("express")
const router = express.Router()
const uploadI = require("../utils/upload")
const {
  createReview,
  replyToReview,
  getAllReviews,
  updateReply,
  deleteReply,
  // getSingleReview,
  updateReview,
  getReviewByUserId,
  getReviewByProductId,
  getReviewsWithoutReply
  // deleteReview,
} = require("../controllers/reviewController")

const { authenticateUser,authorizePermissions } = require("../middleware/authentication")

router.get("/without-reply", authenticateUser,authorizePermissions("admin","employee"), getReviewsWithoutReply);

router.route("/").post(authenticateUser,authorizePermissions("admin","user", "employee"), uploadI.fields([{ name: 'imagesReview', maxCount: 10 }]),createReview).get(getAllReviews).get(getReviewByUserId)

router.route("/:id").post(authenticateUser,authorizePermissions("admin","employee"),replyToReview).patch(authenticateUser,authorizePermissions("admin","user", "employee"),uploadI.fields([{ name: 'imagesReview', maxCount: 10 }]),updateReview).get(getReviewByProductId)

router.route("/update-reply/:id").patch(authenticateUser,authorizePermissions("admin", "employee"),updateReply)
router.route("/delete-reply/:id").delete(authenticateUser,authorizePermissions("admin", "employee"),deleteReply)
//   .get(getSingleReview)
//   .patch(authenticateUser, updateReview)
//   .delete(authenticateUser, deleteReview)

module.exports = router
