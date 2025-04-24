const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email',
    },
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 8,
    select: false,
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters'],
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters'],
  },
  taxId: {
    type: String,
    trim: true,
    maxlength: [20, 'Tax ID cannot be more than 20 characters'],
  },
  companyName: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters'],
  },
  companyTaxId: {
    type: String,
    trim: true,
    maxlength: [20, 'Company tax ID cannot be more than 20 characters'],
  },
  companyAddress: {
    type: String,
    trim: true,
    maxlength: [200, 'Company address cannot be more than 200 characters'],
  },
  isSelfEmployed: {
    type: Boolean,
    default: false,
  },
  logo: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'verified'],
    default: 'pending',
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'guest'],
    default: 'user',
  },
  verificationCode: {
    type: String,
    length: 6,
  },
  verificationAttempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);