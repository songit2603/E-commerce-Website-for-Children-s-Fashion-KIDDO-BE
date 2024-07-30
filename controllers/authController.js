const { StatusCodes } = require("http-status-codes")
const CustomError = require("../errors")
const { createTokenUser, attachCookiesToResponse } = require("../utils")
const { format } = require("date-fns");
const User = require("../models/userModel")
const crypto = require('crypto');
const emailService = require('../utils/emailService');
// Register User
const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Kiểm tra định dạng email
  const emailSuffix = "@gmail.com";
  if (!email.endsWith(emailSuffix)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      data: "Invalid email format. Only @gmail.com addresses are allowed."
    });
  }

  const emailAlreadyExists = await User.findOne({ email });
  if (emailAlreadyExists) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "error",
      data: "Email already exists"
    });
  }
  const currentDate = new Date();
  const formattedDate = format(currentDate, "HH:mm dd/MM/yyyy");
  // Add first registered user as admin
  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? "admin" : "user";
  const user = await User.create({ name, email, password, role,createDate: formattedDate,
    modifyDate: formattedDate });

  // Create token user
  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });

  // Send success response with user data
  res.status(StatusCodes.OK).json({
    status: "success",
    data: {
      user: tokenUser
    }
  });
};

// Login User
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError.BadRequestError("Please provide email and password");
    }

    const user = await User.findOne({ email }).populate("vipStatus.level");

    if (!user) {
      throw new CustomError.UnauthorizedError("No user found");
    }

    // Check if the user is banned
    if (user.status === "banned") {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: "error",
        data: { message: "Your account is banned. Contact support for assistance." },
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: "error",
        data: { message: "Incorrect email or password" },
      });
    }

    const tokenUser = createTokenUser(user);
    const token = attachCookiesToResponse({ res, user: tokenUser });
    const role = user.role;
    const jsonResponse = {
      status: "success",
      token,
      data: {
        email,
        // Avoid sending the password in the response
      },
      role
    };

    res.status(StatusCodes.OK).json(jsonResponse);
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      data: { message: "Internal server error" },
    });
  }
};

const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    expires: new Date(0), // Set expiration date to a past date
  });
  res.status(StatusCodes.OK).json({ msg: "User logged out!" });
};

// const logout = async (req, res) => {
//   res.cookie("token", "no token", {
//     httpOnly: true,
//     expires: new Date(Date.now()),
//   })
//   res.send()
// }

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  console.log(user)
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "error",
      data: "User not found with this email"
    });
  }

  // Generate and set password reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL to email to provided email
  const resetUrl = `http://localhost:3000/kiddo/auth-pass-change-basic/${resetToken}`;

  try {
    // Update the call to include email and the reset URL
    await emailService.sendResetPasswordEmail(email, resetUrl); // Assuming sendResetPasswordEmail expects email and URL

    res.status(StatusCodes.OK).json({
      status: "success",
      data: "Email sent"
    });
  } catch (error) {
    // Reset the password reset fields in case of failure
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      data: "Email could not be sent"
    });
  }
};

const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: "error",
        data: { message: 'Password reset token is invalid or has expired' }
      });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: "error",
        data: { message: 'Passwords do not match' }
      });
    }

    // Setup new password
    user.password = req.body.password;
    await user.save();

    // Clear the reset password fields only after successful save
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send success response
    return res.status(StatusCodes.OK).json({
      status: "success",
      data: { user: createTokenUser(user) }
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      data: { message: 'Internal server error' }
    });
  }
};
module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword
}
