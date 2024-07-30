const express = require("express")
const router = express.Router()
const {
    createAddress,
    getAddressesByUserId,
    // getAddressByAddressId,
    updateAddressById,
    deleteAddress
  } = require("../controllers/addressController")
const {
    authenticateUser,
    authorizePermissions,
  } = require("../middleware/authentication")

router
  .route("/")
  //.post(createCategory)
  .post(authenticateUser,createAddress)
  .get(authenticateUser, getAddressesByUserId)

router
  .route("/:id")  
  // .get(authenticateUser, getAddressByAddressId)
  .get(authenticateUser, getAddressesByUserId)
  .patch(authenticateUser, updateAddressById)
router
  .route("/:userId/:addressId").delete(deleteAddress)  
  module.exports = router