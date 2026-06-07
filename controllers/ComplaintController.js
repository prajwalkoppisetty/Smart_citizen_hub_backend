const ComplaintService=require('../services/ComplaintService');
const mongoose = require("mongoose");


const createComplaint=async(req,res)=>{

    try{
        const citizenId = req.user?.id || req.user?._id;

        // Basic input validation to avoid malformed documents
        const { title, description, category } = req.body;
        if (!title || !description || !category) {
            return res.status(400).json({ success: false, message: 'Missing required fields: title, description, category' });
        }

        if (!mongoose.Types.ObjectId.isValid(citizenId)) {
            return res.status(400).json({ success: false, message: 'Invalid authenticated user id' });
        }

        // If files were uploaded, support both local disk uploads and cloud uploads
        let imagesFromFiles = [];
        if (Array.isArray(req.cloudFiles) && req.cloudFiles.length) {
            imagesFromFiles = req.cloudFiles.map(f => ({ url: f.url, filename: f.filename }));
        } else {
            const files = req.files || [];
            imagesFromFiles = files.map(f => ({ url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`, filename: f.filename }));
        }

        let parsedLocation = undefined;
        if (req.body.location) {
            try {
                parsedLocation = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
            } catch (err) {
                console.warn("Failed to parse location JSON, falling back to address string:", err);
                parsedLocation = { address: req.body.location, latitude: null, longitude: null };
            }
        }

        let parsedAiAnalysis = undefined;
        if (req.body.aiAnalysis) {
            try {
                parsedAiAnalysis = typeof req.body.aiAnalysis === 'string' ? JSON.parse(req.body.aiAnalysis) : req.body.aiAnalysis;
            } catch (err) {
                console.warn("Failed to parse aiAnalysis JSON:", err);
            }
        }

        const complaintData = {
            title: String(title).trim(),
            description: String(description).trim(),
            category: String(category).trim(),
            citizen: citizenId,
            location: parsedLocation,
            aiAnalysis: parsedAiAnalysis
        };

        if (imagesFromFiles.length) {
            complaintData.images = imagesFromFiles;
        } else if (req.body.images) {
            complaintData.images = req.body.images;
        }

        const complaint=await ComplaintService.createComplaint(complaintData);
        res.status(201).json({
            success:true,
            data:complaint
        }
        );


    } catch (error) {
        res.status(400).json({ 
            success:false,
            message:error.message
         });
    }


}

const getComplaints=async(req,res)=>{
    try{
        const filters = {
            status: req.query.status,
            category: req.query.category,
            search: req.query.search
        };

        const complaints=await ComplaintService.getComplaints(filters);
        res.status(200).json({
            success:true,
            data:complaints
        });
    }catch(error){
        res.status(400).json({success:false,message:error.message});
    }
}

const getComplaintById = async(req,res)=>{
    try{

        if(!mongoose.Types.ObjectId.isValid(req.params.id)){
            return res.status(400).json({
                success:false,
                message:"Invalid Complaint ID"
            });
        }

        const complaint =
            await ComplaintService.getComplaintById(req.params.id);

        if(!complaint){
            return res.status(404).json({
                success:false,
                message:"Complaint not found"
            });
        }

        res.status(200).json({
            success:true,
            data:complaint
        });

    }catch(error){

        res.status(500).json({
            success:false,
            message:error.message
        });

    }
}
const updateComplaint=async(req,res)=>{
    try{
        // Allow file uploads to be attached during update; support cloud or local
        let imagesFromFiles = [];
        if (Array.isArray(req.cloudFiles) && req.cloudFiles.length) {
            imagesFromFiles = req.cloudFiles.map(f => ({ url: f.url, filename: f.filename }));
        } else {
            const files = req.files || [];
            imagesFromFiles = files.map(f => ({ url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`, filename: f.filename }));
        }

        const updateData = { ...req.body };
        if (req.body.location) {
            try {
                updateData.location = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
            } catch (err) {
                console.warn("Failed to parse location JSON, using as address string:", err);
                updateData.location = { address: req.body.location };
            }
        }

        if (imagesFromFiles.length) {
            // Append uploaded images to provided images array (client can send images[] with URLs to keep existing)
            const existingImages = Array.isArray(req.body.images) ? req.body.images : [];
            updateData.images = [...existingImages, ...imagesFromFiles];
        }

        const updated=await ComplaintService.updateComplaint(req.params.id,updateData, req.user?.id || req.user?._id );
        if(!updated){
            return res.status(404).json({success:false,message:'Complaint not found'});
        }
        res.status(200).json({success:true,data:updated});
    }catch(error){
        res.status(400).json({success:false,message:error.message});
    }
}

const getMyComplaints = async (req, res) => {
    try {
        const citizenId = req.user?.id || req.user?._id;
        if (!citizenId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing user id in token' });
        }
        const complaints = await ComplaintService.getComplaintsByCitizen(citizenId);
        res.status(200).json({ success: true, data: complaints });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

const getComplaintStats = async (req, res) => {
    try {
        const stats = await ComplaintService.getComplaintsStats();
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const getFieldOfficers = async (req, res) => {
    try {
        const officers = await ComplaintService.getFieldOfficers();
        res.status(200).json({ success: true, data: officers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const getLocalOfficers = async (req, res) => {
    try {
        const officers = await ComplaintService.getLocalOfficers();
        res.status(200).json({ success: true, data: officers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const getWorkflowDashboard = async (req, res) => {
    try {
        const dashboard = await ComplaintService.getWorkflowDashboard();
        res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const getAssignedComplaints = async (req, res) => {
    try {
        const complaints = await ComplaintService.getComplaintsForOfficer(req.user);
        res.status(200).json({ success: true, data: complaints });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

const assignFieldOfficer = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const { fieldOfficerId, notes } = req.body;
        if (!fieldOfficerId) {
            return res.status(400).json({ success: false, message: 'fieldOfficerId is required' });
        }

        const updated = await ComplaintService.assignFieldOfficer(complaintId, req.user?._id || req.user?.id, fieldOfficerId, notes);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

const submitFieldWork = async (req, res) => {
    try {
        const complaintId = req.params.id;

        let beforeImages = [];
        let afterImages = [];
        if (Array.isArray(req.cloudFiles) && req.cloudFiles.length) {
            afterImages = req.cloudFiles.map(f => ({ url: f.url, filename: f.filename }));
        } else if (Array.isArray(req.files) && req.files.length) {
            afterImages = req.files.map(f => ({ url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`, filename: f.filename }));
        }

        if (req.body.beforeImages) {
            try {
                beforeImages = typeof req.body.beforeImages === 'string' ? JSON.parse(req.body.beforeImages) : req.body.beforeImages;
            } catch {
                beforeImages = [];
            }
        }

        const updated = await ComplaintService.submitFieldWork(complaintId, req.user?._id || req.user?.id, {
            notes: req.body.notes,
            beforeImages,
            afterImages
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

const reviewFieldWork = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const { action, comments } = req.body;

        if (!action) {
            return res.status(400).json({ success: false, message: 'action is required' });
        }

        const updated = await ComplaintService.reviewFieldWork(complaintId, req.user?._id || req.user?.id, action, comments);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

const checkDuplicate = async (req, res) => {
    try {
        const { category, latitude, longitude } = req.body;
        if (!category || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required parameters: category, latitude, longitude' });
        }
        
        const duplicate = await ComplaintService.findDuplicateComplaints(category, Number(latitude), Number(longitude));
        
        if (duplicate) {
            return res.status(200).json({
                success: true,
                duplicateFound: true,
                duplicate: {
                    id: duplicate._id || duplicate.id,
                    title: duplicate.title,
                    status: duplicate.status,
                    location: duplicate.location?.address || 'Nearby Location',
                    date: duplicate.createdAt ? new Date(duplicate.createdAt).toLocaleDateString() : 'Recent'
                }
            });
        }
        
        return res.status(200).json({
            success: true,
            duplicateFound: false
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

const subscribeToComplaint = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const complaintId = req.params.id;
        
        if (!mongoose.Types.ObjectId.isValid(complaintId)) {
            return res.status(400).json({ success: false, message: 'Invalid complaint ID' });
        }

        const updated = await ComplaintService.subscribeToComplaint(complaintId, userId);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }
        
        return res.status(200).json({ success: true, message: 'Subscribed to complaint successfully', data: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

const getOfficerAnalytics = async (req, res) => {
    try {
        const analytics = await ComplaintService.getOfficerAnalyticsData();
        return res.status(200).json({ success: true, data: analytics });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

const analyzeComplaint = async (req, res) => {
    try {
        const { imageBase64, description } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ success: false, message: 'Image base64 data is required for analysis' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is not defined in backend environment.');
            return res.status(500).json({ success: false, message: 'Gemini AI API key is not configured on the server.' });
        }

        const MODEL_CANDIDATES = [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-2.5-pro"
        ];

        const prompt = `
You are an AI civic complaint classifier.

Available categories:
1. Road & Infrastructure
2. Water & Sanitation
3. Garbage & Waste
4. Electricity & Lighting
5. Others / Public Health

Analyze the provided image and description.
Description: "${description || 'No description provided.'}"

You must determine the following:
- title: A short, professional, and formal 4-8 word title for the complaint (e.g., 'Overflowing Public Garbage Bin' or 'Dangerous Pothole on Roadway').
- summary: A very brief, one-sentence description summarizing the issue (e.g., 'Broken streetlight on 5th avenue causing dark roadway hazards').
- description: A clean, grammatically correct, formal, and detailed paragraph describing the issue. Synthesize both what is visible in the image and what the user wrote in their description.
- category: Must be exactly one of the five categories listed above.
- severity: Must be exactly 'Low', 'Medium', or 'High'.
- confidence: An integer between 0 and 100 representing your confidence level.

Return ONLY a raw JSON object matching the schema below. Do not wrap it in markdown code blocks, do not add comments, and do not add any extra text.

{
 "title": "formal title",
 "summary": "brief summary line",
 "description": "detailed formal description",
 "category": "category name",
 "severity": "severity rating",
 "confidence": 95
}
`;

        let lastError = null;
        for (const modelName of MODEL_CANDIDATES) {
            try {
                console.log(`[AI Analysis] Attempting backend analysis using model: ${modelName}`);
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            inlineData: {
                                                mimeType: "image/jpeg",
                                                data: imageBase64
                                            }
                                        },
                                        {
                                            text: prompt
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API returned status ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!responseText) {
                    throw new Error("Empty response received from Gemini API");
                }

                const cleanedText = responseText.trim().replace(/^```json\s*|```\s*$/gi, '');
                const parsedData = JSON.parse(cleanedText);

                console.log(`[AI Analysis] Backend analysis success using model: ${modelName}`);
                return res.status(200).json({ success: true, analysis: parsedData });
            } catch (err) {
                console.warn(`[AI Analysis] Model ${modelName} failed on backend. Error:`, err.message || err);
                lastError = err;
                continue;
            }
        }

        throw lastError || new Error("All Gemini model candidates failed.");
    } catch (error) {
        console.error('[AI Analysis] Backend analysis error:', error);
        return res.status(500).json({ success: false, message: error.message || 'AI Analysis failed' });
    }
};

module.exports = {
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
    getOfficerAnalytics,
    analyzeComplaint
};




