const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
    
    title:{
        type:String,
        required:true,
        trim:true
    },

    description:{
        type:String,
        required:true
    },

    category:{
        type:String,
        required:true
    },

    status:{
        type:String,
        enum:[
            "Submitted",
            "Under Review",
            "Assigned",
            "In Progress",
            "Work Completed",
            "Verification Pending",
            "Resolved",
            "Escalated"
        ],
        default:"Submitted"
    },

    currentLayer:{
        type:String,
        enum:[
            "local_officer",
            "municipal_officer",
            "admin",
            "hq"
        ],
        default:"local_officer"
    },

    location:{
        address:{
            type:String,
            default:null
        },

        latitude:{
            type:Number,
            default:null
        },

        longitude:{
            type:Number,
            default:null
        }
    },

    citizen:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    officer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:null
    },

    assignment: {
        fieldOfficer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        assignedAt: {
            type: Date,
            default: null
        },
        notes: {
            type: String,
            default: ''
        }
    },

    fieldWork: {
        notes: {
            type: String,
            default: ''
        },
        beforeImages: [
            {
                url: { type: String, required: true },
                filename: { type: String, default: '' }
            }
        ],
        afterImages: [
            {
                url: { type: String, required: true },
                filename: { type: String, default: '' }
            }
        ],
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        }
    },

    verification: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'rework_requested'],
            default: 'pending'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        comments: {
            type: String,
            default: ''
        }
    },

    images: [
        {
            url: { type: String, required: true },
            filename: { type: String, default: '' }
        }
    ],

    remarks:{
        type:String,
        default:""
    }

    ,statusHistory: [
        {
            from: { type: String, default: '' },
            to: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            remarks: { type: String, default: '' }
        }
    ],

    escalation: {
        escalated: { type: Boolean, default: false },
        escalatedAt: { type: Date, default: null },
        escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reason: { type: String, default: '' }
    },

    aiAnalysis: {
        category: { type: String, default: '' },
        summary: { type: String, default: '' },
        severity: { type: String, default: '' },
        confidence: { type: Number, default: 0 }
    },

    slaDeadline: {
        type: Date,
        default: null
    },

    subscribers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ]

},{
    timestamps:true
});


module.exports = mongoose.model("Complaint", complaintSchema);