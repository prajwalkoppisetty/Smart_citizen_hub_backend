const Complaint = require('../models/Complaints');
const User = require('../models/Users');


const createComplaint = async (data) => {
    try {
        // Basic sanitization
        if (data.title) data.title = String(data.title).trim();
        if (data.description) data.description = String(data.description).trim();
        if (data.category) data.category = String(data.category).trim();

        // Normalize images if provided: ensure array of {url, filename}
        if (Array.isArray(data.images)) {
            data.images = data.images
                .map(img => {
                    if (!img) return null;
                    if (typeof img === 'string') return { url: String(img).trim(), filename: '' };
                    if (img.url) return { url: String(img.url).trim(), filename: img.filename ? String(img.filename).trim() : '' };
                    return null;
                })
                .filter(Boolean);
        }

        // Calculate SLA Deadline
        const getSlaDays = (category) => {
            switch (category) {
                case 'Road & Infrastructure': return 7;
                case 'Water & Sanitation': return 3;
                case 'Garbage & Waste': return 2;
                case 'Electricity & Lighting': return 3;
                default: return 5;
            }
        };
        const slaDays = getSlaDays(data.category);
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + slaDays);
        data.slaDeadline = deadline;

        const complaint = await Complaint.create(data);
        return complaint;
    } catch (err) {
        // Re-throw with clearer message for controller handling
        throw new Error(err.message || 'Failed to create complaint');
    }
}


const getComplaints = async (filters = {}) => {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.citizenId) query.citizen = filters.citizenId;
    if (filters.search) {
        const s = String(filters.search).trim();
        query.$or = [
            { title: { $regex: s, $options: 'i' } },
            { description: { $regex: s, $options: 'i' } }
        ];
    }

    return await Complaint.find(query)
        .populate("citizen", "name email")
        .populate('officer', 'name email role')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('assignment.assignedBy', 'name email role')
        .populate('fieldWork.completedBy', 'name email role')
        .populate('verification.reviewedBy', 'name email role');
}

const getComplaintById = async (id) => {
    return await Complaint.findById(id)
        .populate("citizen", "name email")
        .populate('officer', 'name email role')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('assignment.assignedBy', 'name email role')
        .populate('fieldWork.completedBy', 'name email role')
        .populate('verification.reviewedBy', 'name email role');
}

const updateComplaint = async (id, data, updatedBy = null) => {
    // Fetch existing to detect status changes
    const existing = await Complaint.findById(id);
    if (!existing) return null;

    const updates = { ...data };

    // Normalize images if provided (reuse create flow behavior)
    if (Array.isArray(updates.images)) {
        updates.images = updates.images
            .map(img => {
                if (!img) return null;
                if (typeof img === 'string') return { url: String(img).trim(), filename: '' };
                if (img.url) return { url: String(img.url).trim(), filename: img.filename ? String(img.filename).trim() : '' };
                return null;
            })
            .filter(Boolean);
    }

    // If status is changing, append to statusHistory
    if (updates.status && updates.status !== existing.status) {
        if (updates.status === 'Escalated') {
            const currentLyr = existing.currentLayer || 'local_officer';
            if (currentLyr === 'local_officer') {
                updates.currentLayer = 'municipal_officer';
                updates.status = 'Under Review';
                updates.remarks = `Escalated from Local Officer to Municipal Officer Layer. Remarks: ${updates.remarks || updates.officerRemarks || ''}`;
                updates.officerRemarks = updates.remarks;
            } else if (currentLyr === 'municipal_officer') {
                updates.currentLayer = 'admin';
                updates.status = 'Under Review';
                updates.remarks = `Escalated from Municipal Officer to Admin Layer. Remarks: ${updates.remarks || updates.officerRemarks || ''}`;
                updates.officerRemarks = updates.remarks;
            } else if (currentLyr === 'admin') {
                updates.currentLayer = 'hq';
                updates.remarks = `Escalated to Municipal HQ / Escalated. Remarks: ${updates.remarks || updates.officerRemarks || ''}`;
                updates.officerRemarks = updates.remarks;
            }
        }

        const entry = {
            from: existing.status || '',
            to: updates.status,
            timestamp: new Date(),
            updatedBy: updatedBy || null,
            remarks: updates.remarks || updates.officerRemarks || ''
        };

        // push to array
        if (!existing.statusHistory) existing.statusHistory = [];
        existing.statusHistory.push(entry);

        // handle escalation metadata when moved to 'Escalated' or escalated layers
        if (updates.status === 'Escalated' || updates.currentLayer === 'municipal_officer' || updates.currentLayer === 'admin' || updates.currentLayer === 'hq') {
            existing.escalation = existing.escalation || {};
            existing.escalation.escalated = true;
            existing.escalation.escalatedAt = new Date();
            existing.escalation.escalatedBy = updatedBy || null;
            if (updates.escalationReason || updates.remarks) {
                existing.escalation.reason = updates.escalationReason || updates.remarks;
            }
        }
    }

    // Apply other updates
    Object.keys(updates).forEach(k => {
        existing[k] = updates[k];
    });

    await existing.save();
    return await Complaint.findById(id)
        .populate('citizen', 'name email')
        .populate('officer', 'name email role')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('assignment.assignedBy', 'name email role')
        .populate('fieldWork.completedBy', 'name email role')
        .populate('verification.reviewedBy', 'name email role');
}

const getComplaintsStats = async () => {
    const total = await Complaint.countDocuments();
    const submitted = await Complaint.countDocuments({ status: 'Submitted' });
    const underReview = await Complaint.countDocuments({ status: 'Under Review' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const escalated = await Complaint.countDocuments({ 'escalation.escalated': true });

    return {
        total,
        submitted,
        underReview,
        inProgress,
        resolved,
        escalated
    };
}

const getComplaintsByCitizen = async (citizenId) => {
    return await getComplaints({ citizenId });
}

const getComplaintsForOfficer = async (user) => {
    const role = user?.role;
    const userId = user?._id || user?.id;

    if (!userId) {
        throw new Error('Missing user id');
    }

    if (role === 'field_officer') {
        return await Complaint.find({ 'assignment.fieldOfficer': userId })
            .populate('citizen', 'name email')
            .populate('officer', 'name email')
            .populate('assignment.fieldOfficer', 'name email role')
            .populate('assignment.assignedBy', 'name email role')
            .populate('fieldWork.completedBy', 'name email role')
            .populate('verification.reviewedBy', 'name email role')
            .sort({ updatedAt: -1 });
    }

    return await Complaint.find()
        .populate('citizen', 'name email')
        .populate('officer', 'name email')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('assignment.assignedBy', 'name email role')
        .populate('fieldWork.completedBy', 'name email role')
        .populate('verification.reviewedBy', 'name email role')
        .sort({ updatedAt: -1 });
}

const getFieldOfficers = async () => {
    return await User.find({ role: 'field_officer', isActive: true })
        .select('name email role ward profileImage isActive');
}

const getLocalOfficers = async () => {
    return await User.find({ role: 'local_officer', isActive: true })
        .select('name email role ward department profileImage isActive');
}

const getWorkflowDashboard = async () => {
    const [all, assigned, inProgress, verificationPending, workCompleted, resolved, escalated, fieldOfficers] = await Promise.all([
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: 'Assigned' }),
        Complaint.countDocuments({ status: 'In Progress' }),
        Complaint.countDocuments({ status: 'Verification Pending' }),
        Complaint.countDocuments({ status: 'Work Completed' }),
        Complaint.countDocuments({ status: 'Resolved' }),
        Complaint.countDocuments({ status: 'Escalated' }),
        User.countDocuments({ role: 'field_officer', isActive: true })
    ]);

    const recentComplaints = await Complaint.find()
        .populate('citizen', 'name email')
        .populate('assignment.fieldOfficer', 'name email role')
        .sort({ updatedAt: -1 })
        .limit(8);

    return {
        total: all,
        assigned,
        inProgress,
        verificationPending,
        workCompleted,
        resolved,
        escalated,
        fieldOfficerCount: fieldOfficers,
        recentComplaints
    };
}

const assignFieldOfficer = async (complaintId, assignedById, fieldOfficerId, notes = '') => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return null;

    const fieldOfficer = await User.findById(fieldOfficerId);
    if (!fieldOfficer || fieldOfficer.role !== 'field_officer') {
        throw new Error('Selected user is not a field officer');
    }

    const previousStatus = complaint.status;
    complaint.assignment = complaint.assignment || {};
    complaint.assignment.fieldOfficer = fieldOfficer._id;
    complaint.assignment.assignedBy = assignedById;
    complaint.assignment.assignedAt = new Date();
    complaint.assignment.notes = notes ? String(notes).trim() : '';
    complaint.officer = fieldOfficer._id;
    complaint.status = 'Assigned';

    complaint.remarks = notes ? String(notes).trim() : '';
    complaint.statusHistory = complaint.statusHistory || [];
    complaint.statusHistory.push({
        from: previousStatus || '',
        to: 'Assigned',
        timestamp: new Date(),
        updatedBy: assignedById,
        remarks: notes ? String(notes).trim() : ''
    });

    await complaint.save();
    return await Complaint.findById(complaintId)
        .populate('citizen', 'name email')
        .populate('officer', 'name email role')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('assignment.assignedBy', 'name email role');
}

const submitFieldWork = async (complaintId, fieldOfficerId, payload) => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return null;

    const assignedFieldOfficer = complaint.assignment?.fieldOfficer?.toString();
    if (!assignedFieldOfficer || assignedFieldOfficer !== String(fieldOfficerId)) {
        throw new Error('Complaint is not assigned to this field officer');
    }

    const updates = {};
    if (payload.notes !== undefined) updates['fieldWork.notes'] = String(payload.notes).trim();
    if (Array.isArray(payload.beforeImages)) updates['fieldWork.beforeImages'] = payload.beforeImages;
    if (Array.isArray(payload.afterImages)) updates['fieldWork.afterImages'] = payload.afterImages;

    Object.assign(complaint.fieldWork, {
        notes: updates['fieldWork.notes'] ?? complaint.fieldWork?.notes ?? '',
        beforeImages: updates['fieldWork.beforeImages'] ?? complaint.fieldWork?.beforeImages ?? [],
        afterImages: updates['fieldWork.afterImages'] ?? complaint.fieldWork?.afterImages ?? [],
        completedBy: fieldOfficerId,
        completedAt: new Date()
    });

    const previousStatus = complaint.status;
    complaint.status = 'Verification Pending';
    complaint.verification = complaint.verification || {};
    complaint.verification.status = 'pending';
    complaint.verification.reviewedBy = null;
    complaint.verification.reviewedAt = null;
    complaint.verification.comments = '';

    complaint.remarks = payload.notes ? String(payload.notes).trim() : '';
    complaint.statusHistory = complaint.statusHistory || [];
    complaint.statusHistory.push({
        from: previousStatus || '',
        to: 'Verification Pending',
        timestamp: new Date(),
        updatedBy: fieldOfficerId,
        remarks: payload.notes ? String(payload.notes).trim() : ''
    });

    await complaint.save();
    return await Complaint.findById(complaintId)
        .populate('citizen', 'name email')
        .populate('officer', 'name email role')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('fieldWork.completedBy', 'name email role');
}

const reviewFieldWork = async (complaintId, reviewerId, action, comments = '') => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return null;

    const actionMap = {
        approve: 'Resolved',
        reject: 'Under Review',
        rework: 'In Progress',
        escalate: 'Escalated'
    };

    let nextStatus = actionMap[action];
    if (!nextStatus) {
        throw new Error('Invalid verification action');
    }

    let resolvedComments = comments ? String(comments).trim() : '';

    if (action === 'escalate') {
        const currentLyr = complaint.currentLayer || 'local_officer';
        if (currentLyr === 'local_officer') {
            complaint.currentLayer = 'municipal_officer';
            nextStatus = 'Under Review';
            resolvedComments = `Escalated from Local Officer to Municipal Officer Layer. Reviewer Notes: ${comments}`;
        } else if (currentLyr === 'municipal_officer') {
            complaint.currentLayer = 'admin';
            nextStatus = 'Under Review';
            resolvedComments = `Escalated from Municipal Officer to Admin Layer. Reviewer Notes: ${comments}`;
        } else if (currentLyr === 'admin') {
            complaint.currentLayer = 'hq';
            nextStatus = 'Escalated';
            resolvedComments = `Escalated to Municipal HQ / Escalated. Reviewer Notes: ${comments}`;
        }
    }

    const previousStatus = complaint.status;
    complaint.status = nextStatus;
    complaint.verification = complaint.verification || {};
    complaint.verification.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'rework' ? 'rework_requested' : 'pending';
    complaint.verification.reviewedBy = reviewerId;
    complaint.verification.reviewedAt = new Date();
    complaint.verification.comments = resolvedComments;

    if (action === 'escalate') {
        complaint.escalation = complaint.escalation || {};
        complaint.escalation.escalated = true;
        complaint.escalation.escalatedAt = new Date();
        complaint.escalation.escalatedBy = reviewerId;
        complaint.escalation.reason = resolvedComments;
    }

    complaint.remarks = resolvedComments;
    complaint.statusHistory = complaint.statusHistory || [];
    complaint.statusHistory.push({
        from: previousStatus || '',
        to: nextStatus,
        timestamp: new Date(),
        updatedBy: reviewerId,
        remarks: resolvedComments
    });

    await complaint.save();
    return await Complaint.findById(complaintId)
        .populate('citizen', 'name email')
        .populate('officer', 'name email role')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('verification.reviewedBy', 'name email role');
}

const findDuplicateComplaints = async (category, latitude, longitude) => {
    if (!category || latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
        return null;
    }
    
    // Find active complaints (not resolved) matching the target category
    const active = await Complaint.find({
        category,
        status: { $ne: 'Resolved' }
    });

    // Haversine formula to compute distance in meters
    const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // meters
        const phi1 = lat1 * Math.PI/180;
        const phi2 = lat2 * Math.PI/180;
        const deltaPhi = (lat2-lat1) * Math.PI/180;
        const deltaLambda = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in meters
    };

    // Threshold is 150 meters
    for (const comp of active) {
        if (comp.location && comp.location.latitude && comp.location.longitude) {
            const dist = getDistanceInMeters(latitude, longitude, comp.location.latitude, comp.location.longitude);
            if (dist <= 150) {
                return comp; // return first match
            }
        }
    }
    
    return null;
};

const subscribeToComplaint = async (complaintId, userId) => {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return null;

    if (!complaint.subscribers) {
        complaint.subscribers = [];
    }
    if (!complaint.subscribers.includes(userId)) {
        complaint.subscribers.push(userId);
        await complaint.save();
    }
    return complaint;
};

const getOfficerAnalyticsData = async () => {
    // Fetch all complaints
    const complaints = await Complaint.find()
        .populate('officer', 'name email role')
        .populate('assignment.fieldOfficer', 'name email role')
        .populate('fieldWork.completedBy', 'name email role');

    // Fetch all officers (local and field) to build a unified index
    const officers = await User.find({
        role: { $in: ['local_officer', 'field_officer'] },
        isActive: true
    });

    const performanceMap = {};

    // Pre-populate with all active officers so we have 0-stats for everyone
    officers.forEach(o => {
        performanceMap[o._id.toString()] = {
            id: o._id.toString(),
            name: o.name,
            role: o.role === 'field_officer' ? 'Field Officer' : 'Local Officer',
            ward: o.ward || 'General',
            assigned: 0,
            resolved: 0,
            active: 0,
            overdue: 0,
            slaComplianceCount: 0,
            totalResolutionTimeHrs: 0
        };
    });

    // Process complaints
    complaints.forEach(c => {
        let primaryOfficerId = null;
        if (c.assignment?.fieldOfficer) {
            primaryOfficerId = c.assignment.fieldOfficer._id.toString();
        } else if (c.officer) {
            primaryOfficerId = c.officer._id.toString();
        }

        if (primaryOfficerId) {
            if (!performanceMap[primaryOfficerId]) {
                const name = c.assignment?.fieldOfficer?.name || c.officer?.name || 'Unknown Officer';
                const role = c.assignment?.fieldOfficer?.role === 'field_officer' ? 'Field Officer' : 'Local Officer';
                performanceMap[primaryOfficerId] = {
                    id: primaryOfficerId,
                    name,
                    role,
                    ward: 'General',
                    assigned: 0,
                    resolved: 0,
                    active: 0,
                    overdue: 0,
                    slaComplianceCount: 0,
                    totalResolutionTimeHrs: 0
                };
            }

            const stats = performanceMap[primaryOfficerId];
            stats.assigned++;

            if (c.status === 'Resolved') {
                stats.resolved++;

                // Check SLA Compliance
                if (c.slaDeadline) {
                    const resolvedAt = c.fieldWork?.completedAt || c.updatedAt || new Date();
                    if (new Date(resolvedAt) <= new Date(c.slaDeadline)) {
                        stats.slaComplianceCount++;
                    } else {
                        stats.overdue++;
                    }
                }

                // Calculate Resolution Time (assignedAt to completedAt)
                const start = c.assignment?.assignedAt || c.createdAt;
                const end = c.fieldWork?.completedAt || c.updatedAt;
                if (start && end) {
                    const diffHrs = Math.max(0, (new Date(end) - new Date(start)) / (1000 * 60 * 60));
                    stats.totalResolutionTimeHrs += diffHrs;
                }
            } else {
                stats.active++;
                if (c.slaDeadline && new Date() > new Date(c.slaDeadline)) {
                    stats.overdue++;
                }
            }
        }
    });

    // Finalize metrics
    const results = Object.values(performanceMap).map(o => {
        const avgTime = o.resolved > 0 ? parseFloat((o.totalResolutionTimeHrs / o.resolved).toFixed(1)) : 0;
        const complianceRate = o.resolved > 0 ? Math.round((o.slaComplianceCount / o.resolved) * 100) : 100;
        return {
            id: o.id,
            name: o.name,
            role: o.role,
            ward: o.ward,
            assigned: o.assigned,
            resolved: o.resolved,
            active: o.active,
            overdue: o.overdue,
            avgResolutionTimeHrs: avgTime,
            slaComplianceRate: complianceRate
        };
    });

    return results;
};

module.exports = {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint,
    getComplaintsByCitizen,
    getComplaintsStats,
    getComplaintsForOfficer,
    getFieldOfficers,
    getLocalOfficers,
    getWorkflowDashboard,
    assignFieldOfficer,
    submitFieldWork,
    reviewFieldWork,
    findDuplicateComplaints,
    subscribeToComplaint,
    getOfficerAnalyticsData
};