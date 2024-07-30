const express = require("express")
const router = express.Router()
const {
  createBrand,
  getAllBrands,
  getSingleBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router
  .route("/")
  //.post(createBrand)
  .post(authenticateUser,authorizePermissions("admin","employee"),createBrand)
  .get(getAllBrands)
router
  .route("/:id")
  .get(getSingleBrand)
  .patch(authenticateUser,authorizePermissions("admin","employee"),updateBrand)
  .delete(authenticateUser,authorizePermissions("admin","employee"),deleteBrand)
  //.put([authenticateUser, authorizePermissions("admin")],updateBrand)
  //.delete([authenticateUser, authorizePermissions("admin")], deleteBrand)

module.exports = router