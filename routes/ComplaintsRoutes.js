const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { upload, cloudUpload, validateComplaintImages } = require('../middleware/uploadMiddleware');
const { authorizeComplaintUpdate, authorizeRoles } = require('../middleware/authorize');

const {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint,
    getMyComplaints,
    getComplaintStats,
    getFieldOfficers,
    getLocalOfficers,
    getWorkflowDashboard,
    getAssignedComplaints,
    assignFieldOfficer,
    submitFieldWork,
    reviewFieldWork,
    checkDuplicate,
    subscribeToComplaint,
    getOfficerAnalytics
} = require("../controllers/complaintController");

router.post(
    "/",
    authMiddleware,
    upload.any(),
    validateComplaintImages,
    cloudUpload,
    createComplaint
);

router.get(
    "/stats",
    authMiddleware,
    getComplaintStats
);

router.get(
    "/dashboard",
    authMiddleware,
    authorizeRoles(['local_officer', 'municipal_officer', 'admin', 'field_officer']),
    getWorkflowDashboard
);

router.get(
    "/field-officers",
    authMiddleware,
    authorizeRoles(['local_officer', 'municipal_officer', 'admin']),
    getFieldOfficers
);

router.get(
    "/local-officers",
    authMiddleware,
    authorizeRoles(['local_officer', 'municipal_officer', 'admin']),
    getLocalOfficers
);

router.get(
    "/assigned/me",
    authMiddleware,
    authorizeRoles(['field_officer', 'local_officer', 'municipal_officer', 'admin']),
    getAssignedComplaints
);

router.get(
    "/my",
    authMiddleware,
    getMyComplaints
);

router.get(
    "/",
    authMiddleware,
    getComplaints
);

router.get(
    "/:id",
    authMiddleware,
    getComplaintById
);

router.put(
    "/:id",
    authMiddleware,
    upload.any(),
    validateComplaintImages,
    cloudUpload,
    authorizeComplaintUpdate,
    updateComplaint
);

router.put(
    "/:id/assign-field-officer",
    authMiddleware,
    authorizeRoles(['local_officer', 'municipal_officer', 'admin']),
    assignFieldOfficer
);

router.put(
    "/:id/field-work",
    authMiddleware,
    authorizeRoles(['field_officer']),
    upload.any(),
    validateComplaintImages,
    cloudUpload,
    submitFieldWork
);

router.put(
    "/:id/verification",
    authMiddleware,
    authorizeRoles(['local_officer', 'municipal_officer', 'admin']),
    reviewFieldWork
);

router.post(
    "/check-duplicate",
    authMiddleware,
    checkDuplicate
);

router.post(
    "/:id/subscribe",
    authMiddleware,
    subscribeToComplaint
);

router.get(
    "/analytics/officers",
    authMiddleware,
    authorizeRoles(['municipal_officer', 'admin']),
    getOfficerAnalytics
);

module.exports = router;