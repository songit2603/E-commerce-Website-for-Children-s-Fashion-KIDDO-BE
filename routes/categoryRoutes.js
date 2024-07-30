const express = require("express")
const router = express.Router()
const {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router
  .route("/")
  //.post(createCategory)
  .post(authenticateUser,authorizePermissions("admin","employee"),createCategory)
  .get(getAllCategories)

router
  .route("/:id")
  .get(getSingleCategory)
  // .patch(updateCategory)
  // .delete(deleteCategory)
  .patch(authenticateUser,authorizePermissions("admin","employee"),updateCategory)
  .delete(authenticateUser,authorizePermissions("admin","employee"), deleteCategory)

module.exports = router