const express=require('express');

const router=express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {signup,login,updateProfile,getProfile}=require('../controllers/authController')
 

router.post('/signup',signup);
router.post('/login',login);
router.put('/profile', authMiddleware, updateProfile);
router.get('/profile', authMiddleware, getProfile);

module.exports=router;