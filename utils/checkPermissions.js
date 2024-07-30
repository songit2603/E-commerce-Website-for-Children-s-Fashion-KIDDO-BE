const CustomError = require("../errors/")

const checkPermissions = (requestUser, resourceUserId) => {

  if (requestUser.role === "admin") return //res.status(....)
  if (requestUser.userId === resourceUserId.toString()) return //res.status(....)
  throw new CustomError.UnauthorizedError("Not authorized to access this route")
}

module.exports = checkPermissions
