const mongoose=require('mongoose')

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,    
        trim:true,
        lowercase:true
    },
    password:{
        type:String,
        required:true,
        minlength:6,
        select:false
    },
    phonenumber:{
        type:String,
        required:true,
        trim:true,
        minlength:10
    },
    role:{
        type:String,
        enum:[
            'citizen',
            'local_officer',
            'municipal_officer',    
            'admin',
            'field_officer'
        ],
        default:'citizen'
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    profileImage: {
        type: String,
        default: ""
    },

    ward: {
        type: String,
        default: null
    },

    reputationScore: {
        type: Number,
        default: 0
    },

    isActive: {
        type: Boolean,
        default: true
    },

    lastLogin: {
        type: Date
    }
},
{
    timestamps: true
});

module.exports=mongoose.model('User',userSchema)