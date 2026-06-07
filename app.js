const express=require('express');

const app=express();
const path = require('path');
const fs = require('fs');
const cors = require("cors");

const appRoutes=require('./routes/appRoutes');
const authRoutes=require('./routes/AuthRoutes');
const complaintRoutes=require('./routes/ComplaintsRoutes')

app.use(
  cors({
    origin: (origin, callback) => {
      // In development, dynamically allow the requesting origin (like local IP or localhost)
      callback(null, true);
    },
    credentials: true
  })
);


// Increase payload size to allow image data URLs (base64) sent in JSON bodies.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded files statically from /uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Friendly handler for payloads larger than the configured limits
app.use((err, req, res, next) => {
	if (err && err.type === 'entity.too.large') {
		return res.status(413).json({ success: false, message: 'Payload too large. Reduce image size or use multipart upload.' });
	}
	next(err);
});

app.use('/',appRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/complaints',complaintRoutes);


app.use((err,req,res,next)=>{
	if(err instanceof SyntaxError && err.status===400 && 'body' in err){
		return res.status(400).json({
			success:false,
			message:'Invalid JSON in request body'
		});
	}

	next(err);
});

module.exports=app;