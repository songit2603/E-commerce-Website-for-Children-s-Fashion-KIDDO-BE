const express = require("express")
const router = express.Router()
const {
    getNotifications,
    updateNotificationStatus

} = require("../controllers/notificationController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router.route("/")
  .get(getNotifications)
router.route("/:id").patch(updateNotificationStatus)


module.exports = router