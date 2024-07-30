const express = require("express")
const router = express.Router()

const { register, login, logout, forgotPassword,resetPassword } = require("../controllers/authController")

router.route("/signup").post(register)
router.route("/signin").post(login)
router.route("/logout").get(logout)
router.route('/forgot-password').post(forgotPassword);
router.route('/forgot-password/reset/:token').patch(resetPassword);
module.exports = router
