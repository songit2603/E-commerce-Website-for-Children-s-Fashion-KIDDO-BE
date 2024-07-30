const express = require("express")
const uploadI = require("../utils/upload")
const router = express.Router()
const {
  getSingleBlog,
  getAllBlogs,
  createBlog,
  updateBlog,
  deleteBlog,

} = require("../controllers/blogController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router
  .route("/")
  .post(uploadI.single("image"),createBlog)
  //.post([authenticateUser, authorizePermissions("admin")], uploadI.array("images", 4),createProduct)
  .delete(deleteBlog)
  .get(getAllBlogs)


router
  .route("/:id")
  .get(getSingleBlog)
  .patch(uploadI.single("image"),updateBlog)

module.exports = router
