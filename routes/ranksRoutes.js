const express = require("express")
const router = express.Router()
const uploadI = require("../utils/upload")
const {
  createRank,
  updateRank,
  getAllRanks,
  getSingleRank,
  deleteRank
} = require("../controllers/rankController")
const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication")



router
  .route("/")
  //.post(createCategory)
  .post(authenticateUser,authorizePermissions("admin","employee"),uploadI.fields([{ name: 'imageRank', maxCount: 10 }]),createRank)
  .get(getAllRanks)

router
  .route("/:id")
  .get(getSingleRank)
  .patch(authenticateUser,authorizePermissions("admin","employee"),uploadI.fields([{ name: 'imageRank', maxCount: 10 }]),updateRank)
  .delete(authenticateUser,authorizePermissions("admin","employee"),deleteRank)
//   .patch([authenticateUser, authorizePermissions("admin employee")],updateCategory)
//   .delete([authenticateUser, authorizePermissions("admin employee")], deleteCategory)

module.exports = router