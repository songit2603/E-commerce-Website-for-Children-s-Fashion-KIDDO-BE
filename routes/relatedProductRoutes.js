const express = require("express")
const router = express.Router()
const {
    addRelatedProduct,
    updateRelatedProduct

} = require("../controllers/relatedProductController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router.route("/:id")
  .post(addRelatedProduct)
  .patch(updateRelatedProduct)

module.exports = router