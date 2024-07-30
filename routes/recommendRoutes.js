const express = require("express")
const router = express.Router()
const {
    getRecommendProductTopSelling

} = require("../controllers/recommendController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router.route("/")
  .get(getRecommendProductTopSelling)


module.exports = router