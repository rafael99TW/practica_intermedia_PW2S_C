const validator = require('validator');
const User = require('../models/User');

const validateRegisterInput = async (email, password) => {
  const errors = {};
  
  // Email validation
  if (!validator.isEmail(email)) {
    errors.email = 'Email is invalid';
  } else {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errors.email = 'Email already exists';
    }
  }
  
  // Password validation
  if (!validator.isLength(password, { min: 8 })) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

const validateLoginInput = (email, password) => {
  const errors = {};
  
  if (!validator.isEmail(email)) {
    errors.email = 'Email is invalid';
  }
  
  if (validator.isEmpty(password)) {
    errors.password = 'Password field is required';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

const validateVerificationCode = (code) => {
  const errors = {};
  
  if (!validator.isLength(code, { min: 6, max: 6 }) || !validator.isNumeric(code)) {
    errors.code = 'Verification code must be 6 digits';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

const validateOnboardingData = (data) => {
  const errors = {};
  
  if (!validator.isLength(data.firstName || '', { min: 1, max: 50 })) {
    errors.firstName = 'First name must be between 1 and 50 characters';
  }
  
  if (!validator.isLength(data.lastName || '', { min: 1, max: 50 })) {
    errors.lastName = 'Last name must be between 1 and 50 characters';
  }
  
  if (!validator.isLength(data.taxId || '', { min: 1, max: 20 })) {
    errors.taxId = 'Tax ID must be between 1 and 20 characters';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

const validateCompanyData = (data) => {
  const errors = {};
  
  if (!data.isSelfEmployed && !validator.isLength(data.companyName || '', { min: 1, max: 100 })) {
    errors.companyName = 'Company name must be between 1 and 100 characters';
  }
  
  if (!data.isSelfEmployed && !validator.isLength(data.companyTaxId || '', { min: 1, max: 20 })) {
    errors.companyTaxId = 'Company tax ID must be between 1 and 20 characters';
  }
  
  if (!data.isSelfEmployed && !validator.isLength(data.companyAddress || '', { min: 1, max: 200 })) {
    errors.companyAddress = 'Company address must be between 1 and 200 characters';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateVerificationCode,
  validateOnboardingData,
  validateCompanyData,
};