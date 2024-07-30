const express = require("express")
const router = express.Router()
const {
  getCart,
  addToCart,
  updateCart,
  removeFromCart,

} = require("../controllers/cartController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router.route("/")
  .post(addToCart)
  .get(getCart)
  .patch(updateCart)
  .delete(removeFromCart)
router.route("/:id")


module.exports = router
