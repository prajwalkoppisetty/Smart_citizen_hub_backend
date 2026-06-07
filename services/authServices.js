const User = require('../models/Users');
const bycrypt = require('bcryptjs')
const Generatetoken = require('../utils/Generatetoken')


const signup = async (userData) => {
    const existingUser = await User.findOne({
        email: userData.email
    })

    if (existingUser) {
        throw new Error("User Already Exists")
    }

    const hashedPassword = await bycrypt.hash(userData.password, 10);

    userData.password = hashedPassword;
    const user = await User.create(userData)

    // Return a safe user object (do not expose password or sensitive fields)
    const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phonenumber: user.phonenumber,
        role: user.role
    };

    return safeUser;
}


const login = async (email, password) => {
    const user = await User.findOne({
        email: email
    }).select('+password');

    if (!user) {
        throw new Error("Invalid Email or not registered")
    }

    const passwordMatch = await bycrypt.compare(password, user.password);
    if (!passwordMatch) {
        throw new Error("Invalid Password")
    }

    const token = Generatetoken(user._id);

    const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phonenumber: user.phonenumber,
        role: user.role
    }

    return {
        safeUser,
        token
    }


}


const updateProfile = async (userId, profileData) => {
    const updates = {};

    if (profileData.name !== undefined) updates.name = String(profileData.name).trim();
    if (profileData.email !== undefined) updates.email = String(profileData.email).trim().toLowerCase();
    if (profileData.phone !== undefined) updates.phonenumber = String(profileData.phone).trim();
    if (profileData.phonenumber !== undefined) updates.phonenumber = String(profileData.phonenumber).trim();
    if (profileData.ward !== undefined) updates.ward = profileData.ward === '' ? null : profileData.ward;
    if (profileData.profileImage !== undefined) updates.profileImage = String(profileData.profileImage).trim();

    if (updates.email) {
        const existingUser = await User.findOne({ email: updates.email, _id: { $ne: userId } });
        if (existingUser) {
            throw new Error('Email already in use');
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        throw new Error('User not found');
    }

    return {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phonenumber: updatedUser.phonenumber,
        ward: updatedUser.ward,
        profileImage: updatedUser.profileImage
    };
}

const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phonenumber: user.phonenumber,
        ward: user.ward,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}


module.exports = {
    signup,
    login,
    updateProfile,
    getProfile
}
