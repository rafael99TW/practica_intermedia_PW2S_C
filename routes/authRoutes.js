const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  register,
  verifyEmail,
  login,
  updatePersonalData,
  updateCompanyData,
  uploadLogo,
  getMe,
  deleteUser,
  forgotPassword,
  resetPassword,
  inviteColleague,
} = require('../controllers/authController');
const multer = require('multer');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024, // 1MB
  },
  fileFilter: fileFilter,
});

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', resetPassword);

// Protected routes
router.put('/validation', protect, verifyEmail);
router.put('/register', protect, updatePersonalData);
router.patch('/company', protect, updateCompanyData);
router.patch('/logo', protect, upload.single('logo'), uploadLogo);
router.get('/me', protect, getMe);
router.delete('/me', protect, deleteUser);
router.post('/invite', protect, inviteColleague);

module.exports = router;