require('dotenv').config();

const app=require('./app');

const connectDB=require('./config/db');
const { startAutoEscalationScheduler } = require('./services/AutoEscalationService');

connectDB()
.then(()=>{
    console.log("Db is ready");
    // Start auto-escalation checker
    startAutoEscalationScheduler();
})
.catch((err)=>{
    console.error("Db connection failed:",err.message);
    process.exit(1);
});

const PORT=process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});

