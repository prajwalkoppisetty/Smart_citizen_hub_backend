const authService=require('../services/authServices')


const signup = async(req,res)=>{
    try{
        const user=await authService.signup(req.body);

        res.status(201).json({
            success:true,
            message:"User created successfully",
            data:user
        })
    }
    catch(err){
        res.status(400).json({
            success:false,
            message:err.message
        })
    }
}

const login=async(req,res)=>{
    try{
        const {email,password}=req.body;
        const user=await authService.login(email,password);

        res.status(200).json({
            success:true,
            message:"Login successful and token set successfully",
            data:user
        })

    }
    catch(err){
        res.status(401).json({
            success:false,
            message:err.message
        })
    }
} 

const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const updatedUser = await authService.updateProfile(userId, req.body);

        return res.status(200).json({
            success: true,
            data: updatedUser
        });
    } catch (err) {
        const statusCode = err.message === 'Email already in use' ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'Server error updating profile'
        });
    }
}

const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const user = await authService.getProfile(userId);

        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error retrieving profile'
        });
    }
}

module.exports={
    signup,
    login,
    updateProfile,
    getProfile
}