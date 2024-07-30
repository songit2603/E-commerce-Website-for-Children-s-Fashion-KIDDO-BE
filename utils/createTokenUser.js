const createTokenUser = (user) => {
  return { email: user.email,name: user.name, userId: user._id, password: user.password, role: user.role , avatar: user.avatar, status: user.status, createDate: user.createDate, modifyDate: user.modifyDate, vipStatus: user.vipStatus}
}

module.exports = createTokenUser
