const User = require('../models/User');
const { generateToken, generateVerificationCode } = require('../utils/generateToken');
const {
  validateRegisterInput,
  validateLoginInput,
  validateVerificationCode,
  validateOnboardingData,
  validateCompanyData,
} = require('../utils/validators');
const ErrorResponse = require('../utils/errorResponse');
const path = require('path');
const fs = require('fs');
const validator = require('validator');

// @desc    Register user
// @route   POST /api/user/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    const { errors, isValid } = await validateRegisterInput(email, password);
    
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // Create user
    const user = await User.create({
      email,
      password,
      verificationCode,
    });
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        email: user.email,
        status: user.status,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email
// @route   PUT /api/user/validation
// @access  Private
exports.verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = req.user;
    
    // Validate code
    const { errors, isValid } = validateVerificationCode(code);
    
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }
    
    // Check verification attempts
    if (user.verificationAttempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts reached. Please register again.',
      });
    }
    
    // Check if code matches
    if (code !== user.verificationCode) {
      user.verificationAttempts += 1;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        attemptsLeft: 5 - user.verificationAttempts,
      });
    }
    
    // Update user status
    user.status = 'verified';
    user.verificationCode = undefined;
    user.verificationAttempts = 0;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/user/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    const { errors, isValid } = validateLoginInput(email, password);
    
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }
    
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        status: user.status,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update personal data
// @route   PUT /api/user/register
// @access  Private
exports.updatePersonalData = async (req, res, next) => {
  try {
    const { firstName, lastName, taxId } = req.body;
    const user = req.user;
    
    // Validate input
    const { errors, isValid } = validateOnboardingData({ firstName, lastName, taxId });
    
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }
    
    // Update user
    user.firstName = firstName;
    user.lastName = lastName;
    user.taxId = taxId;
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update company data
// @route   PATCH /api/user/company
// @access  Private
exports.updateCompanyData = async (req, res, next) => {
  try {
    const { companyName, companyTaxId, companyAddress, isSelfEmployed } = req.body;
    const user = req.user;
    
    // Validate input
    const { errors, isValid } = validateCompanyData({
      companyName,
      companyTaxId,
      companyAddress,
      isSelfEmployed,
    });
    
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }
    
    // Update user
    user.isSelfEmployed = isSelfEmployed;
    
    if (isSelfEmployed) {
      user.companyName = `${user.firstName} ${user.lastName}`;
      user.companyTaxId = user.taxId;
      user.companyAddress = '';
    } else {
      user.companyName = companyName;
      user.companyTaxId = companyTaxId;
      user.companyAddress = companyAddress;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload logo
// @route   PATCH /api/user/logo
// @access  Private
exports.uploadLogo = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }
    
    // Check file size (max 1MB)
    if (req.file.size > 1024 * 1024) {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File size should not exceed 1MB',
      });
    }
    
    // Check file type
    if (!req.file.mimetype.startsWith('image')) {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }
    
    // Delete previous logo if exists
    if (user.logo) {
      const oldLogoPath = path.join(__dirname, '..', user.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }
    
    // Update user with new logo path
    user.logo = `/uploads/${req.file.filename}`;
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user
// @route   GET /api/user/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/user/me
// @access  Private
exports.deleteUser = async (req, res, next) => {
  try {
    const user = req.user;
    const { soft = 'true' } = req.query;
    
    if (soft === 'false') {
      // Hard delete
      await user.remove();
    } else {
      // Soft delete (update status)
      user.status = 'deleted';
      await user.save();
    }
    
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/user/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email',
      });
    }
    
    // Generate reset token
    const resetToken = generateVerificationCode();
    
    // Set reset token and expiry
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save();
    
    // In a real app, you would send an email with the reset token here
    // For now, we'll just return it in the response for testing
    res.status(200).json({
      success: true,
      data: {
        resetToken,
        message: 'Reset token generated. In a real app, this would be sent via email.',
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/user/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    const user = await User.findOne({
      passwordResetToken: resetToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }
    
    // Set new password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    // Generate token for immediate login
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Invite colleague
// @route   POST /api/user/invite
// @access  Private
exports.inviteColleague = async (req, res, next) => {
  try {
    const { email } = req.body;
    const invitingUser = req.user;

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Generate random password
    const generatedPassword = Math.random().toString(36).slice(-8);

    // Create guest user
    const guestUser = await User.create({
      email,
      password: generatedPassword,
      role: 'guest',
      status: 'pending',
      companyName: invitingUser.companyName,
      companyTaxId: invitingUser.companyTaxId,
      companyAddress: invitingUser.companyAddress,
      isSelfEmployed: false,
    });

    // Generate verification code
    const verificationCode = generateVerificationCode();
    guestUser.verificationCode = verificationCode;
    await guestUser.save();

    // Respond with email and generated password
    res.status(201).json({
      success: true,
      data: {
        email: guestUser.email,
        password: generatedPassword, // Aquí va la contraseña generada
        message: 'Invitation sent. In a real app, this would be sent via email.',
      },
    });
  } catch (err) {
    next(err);
  }
};
