const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cloudinary optional
let cloudinary;
let streamifier;
const useCloudinary = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
if (useCloudinary) {
    cloudinary = require('cloudinary').v2;
    streamifier = require('streamifier');
    // cloudinary config will be picked from CLOUDINARY_URL or env vars
}

// common file filter and limits
const fileFilter = (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'), false);
    cb(null, true);
};

const limits = { fileSize: 5 * 1024 * 1024 };

let upload;

const validateComplaintImages = (req, res, next) => {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 5) {
        return next(new Error('You can upload a maximum of 5 images per complaint'));
    }
    next();
};

if (useCloudinary) {
    // keep files in memory, then upload to cloudinary in middleware
    upload = multer({ storage: multer.memoryStorage(), limits, fileFilter });

    const cloudUpload = async (req, res, next) => {
        if (!req.files || !req.files.length) return next();
        try {
            const uploads = [];
            for (const file of req.files) {
                const buffer = file.buffer;
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({ folder: 'complaints' }, (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    });
                    streamifier.createReadStream(buffer).pipe(stream);
                });
                uploads.push({ url: result.secure_url, filename: result.public_id });
            }
            req.cloudFiles = uploads;
            next();
        } catch (err) {
            next(err);
        }
    };

    module.exports = { upload, cloudUpload, validateComplaintImages };

} else {
    // fallback: disk storage in /uploads
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    });

    upload = multer({ storage, limits, fileFilter });

    // map uploaded disk files to req.cloudFiles like structure so controllers can use unified shape
    const mapToLocal = (req, res, next) => {
        if (!req.files || !req.files.length) return next();
        req.cloudFiles = req.files.map(f => ({ url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`, filename: f.filename }));
        next();
    };

    module.exports = { upload, cloudUpload: mapToLocal, validateComplaintImages };
}
