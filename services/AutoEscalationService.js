const Complaint = require('../models/Complaints');

/**
 * Executes the auto-escalation check across all non-resolved complaints.
 */
const runAutoEscalation = async () => {
    try {
        // Default escalation window is 3 days in ms
        const windowMs = process.env.AUTO_ESCALATION_WINDOW_MS 
            ? parseInt(process.env.AUTO_ESCALATION_WINDOW_MS) 
            : 3 * 24 * 60 * 60 * 1000; 

        // Find all complaints that are not Resolved and not at HQ layer
        const complaints = await Complaint.find({
            status: { $ne: 'Resolved' },
            currentLayer: { $ne: 'hq' }
        });

        const now = new Date();
        let escalatedCount = 0;

        for (const complaint of complaints) {
            let shouldEscalate = false;
            let nextLayer = '';
            let nextStatus = '';
            let remarks = '';

            const currentLyr = complaint.currentLayer || 'local_officer';
            
            // Reference time is when it was last escalated, otherwise when it was created
            const referenceTime = complaint.escalation?.escalatedAt || complaint.createdAt || now;
            const elapsed = now - referenceTime;

            if (elapsed >= windowMs) {
                shouldEscalate = true;
                if (currentLyr === 'local_officer') {
                    nextLayer = 'municipal_officer';
                    nextStatus = 'Under Review';
                    remarks = `Auto-escalated from Local Officer to Municipal Officer due to inactivity (3 days elapsed since submission).`;
                } else if (currentLyr === 'municipal_officer') {
                    nextLayer = 'admin';
                    nextStatus = 'Under Review';
                    remarks = `Auto-escalated from Municipal Officer to Admin due to inactivity (3 days elapsed since last escalation).`;
                } else if (currentLyr === 'admin') {
                    nextLayer = 'hq';
                    nextStatus = 'Escalated';
                    remarks = `Auto-escalated from Admin to HQ due to inactivity (3 days elapsed since last escalation).`;
                }
            }

            if (shouldEscalate) {
                const previousStatus = complaint.status;
                complaint.currentLayer = nextLayer;
                complaint.status = nextStatus;
                complaint.remarks = remarks;

                complaint.statusHistory = complaint.statusHistory || [];
                complaint.statusHistory.push({
                    from: previousStatus || '',
                    to: nextStatus,
                    timestamp: now,
                    remarks: remarks
                });

                complaint.escalation = {
                    escalated: true,
                    escalatedAt: now,
                    reason: remarks
                };

                await complaint.save();
                escalatedCount++;
                console.log(`[Auto-Escalation] Complaint "${complaint.title}" (ID: ${complaint._id}) auto-escalated to ${nextLayer}.`);
            }
        }

        if (escalatedCount > 0) {
            console.log(`[Auto-Escalation] Check finished. Escalated ${escalatedCount} complaint(s).`);
        }
    } catch (error) {
        console.error('[Auto-Escalation] Error running escalation logic:', error);
    }
};

/**
 * Starts the background checker.
 */
const startAutoEscalationScheduler = () => {
    // Run immediately on server boot
    setTimeout(runAutoEscalation, 5000); // 5s delay to ensure DB is fully connected

    // Check periodically (default every 10 minutes)
    const checkIntervalMs = process.env.AUTO_ESCALATION_CHECK_INTERVAL_MS 
        ? parseInt(process.env.AUTO_ESCALATION_CHECK_INTERVAL_MS) 
        : 10 * 60 * 1000; 
    
    setInterval(runAutoEscalation, checkIntervalMs);
    console.log(`[Auto-Escalation] Scheduler initialized. Checking every ${checkIntervalMs / 1000 / 60} minutes.`);
};

module.exports = {
    runAutoEscalation,
    startAutoEscalationScheduler
};
