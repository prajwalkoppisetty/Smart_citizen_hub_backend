const Complaint = require('../models/Complaints');

const authorizeRoles = (allowedRoles = []) => (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    }
    next();
};

// More advanced middleware for complaint updates:
// - If the request attempts to change `status`, only allow officer/municipal_officer/admin
// - Otherwise, allow the complaint owner (citizen) or officers/admin
const authorizeComplaintUpdate = async (req, res, next) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user?.id || req.user?._id;
        const userRole = req.user?.role;

        if (!complaintId) return res.status(400).json({ success: false, message: 'Missing complaint id' });

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        const isOwner = complaint.citizen && complaint.citizen.toString() === String(userId);
        const isOfficer = ['local_officer', 'municipal_officer', 'admin'].includes(userRole);

        const wantsStatusChange = Object.prototype.hasOwnProperty.call(req.body, 'status') && req.body.status !== complaint.status;

        if (wantsStatusChange) {
            if (!isOfficer) return res.status(403).json({ success: false, message: 'Only officers or admins can change status' });
        } else {
            // allow owner or officer
            if (!isOwner && !isOfficer) return res.status(403).json({ success: false, message: 'Forbidden: not owner or officer' });
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    authorizeRoles,
    authorizeComplaintUpdate
};
