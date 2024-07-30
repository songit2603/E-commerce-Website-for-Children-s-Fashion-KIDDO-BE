const express = require("express")
const router = express.Router()
const uploadI = require("../utils/upload")
const {
  getCartandOrderByAccount,
  getAllAccounts,
  getSingleAccount,
  showCurrentUser,
  updateAccount,
  updateUserPassword,
  deleteAccount
} = require("../controllers/userController")

const { authenticateUser,authorizePermissions } = require("../middleware/authentication")

router
  .route("/")
  .get(authenticateUser, authorizePermissions("admin", "employee"), getAllAccounts)
router.route("/showMe").get(authenticateUser, showCurrentUser)
// router.route("/updateUser").patch(authenticateUser, uploadI.single("image"),updateUser)
router.route("/updateUserPassword").patch(authenticateUser, updateUserPassword)
router.route("/:id").get(authenticateUser, getCartandOrderByAccount).patch(authenticateUser,authorizePermissions("admin"),uploadI.single("image"),updateAccount).delete(authenticateUser, authorizePermissions("admin"),deleteAccount)
module.exports = router
