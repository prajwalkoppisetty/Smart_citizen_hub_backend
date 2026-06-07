const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const args = process.argv.slice(2);
const targetUri = args[0] || process.env.TARGET_MONGO_URI;

if (!targetUri) {
  console.error('Please provide the target MongoDB connection string as an argument or set TARGET_MONGO_URI in your environment.');
  console.error('Usage: node restore.js <TARGET_MONGO_URI>');
  process.exit(1);
}

const restore = async () => {
  try {
    if (!fs.existsSync('./db_dump.json')) {
      console.error('No backup file found at ./db_dump.json. Please run "node backup.js" first.');
      process.exit(1);
    }

    console.log('Reading db_dump.json...');
    const dump = JSON.parse(fs.readFileSync('./db_dump.json', 'utf8'));

    // Redact password from console log for safety
    const safeLogUri = targetUri.replace(/:([^@]+)@/, ':***@');
    console.log(`Connecting to target MongoDB database: ${safeLogUri}...`);
    await mongoose.connect(targetUri);
    console.log('Connected successfully!');

    const db = mongoose.connection.db;

    for (const [name, docs] of Object.entries(dump)) {
      if (docs.length === 0) {
        console.log(`Collection ${name} is empty. Skipping.`);
        continue;
      }
      
      console.log(`Restoring collection ${name} (${docs.length} documents)...`);
      
      // Parse dates and ObjectIds
      const parsedDocs = docs.map(doc => {
        if (doc._id) {
          doc._id = new mongoose.Types.ObjectId(doc._id);
        }
        
        const parseSpecialTypes = (obj) => {
          for (let key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
              if (obj[key].$oid) {
                obj[key] = new mongoose.Types.ObjectId(obj[key].$oid);
              } else {
                parseSpecialTypes(obj[key]);
              }
            } else if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj[key])) {
              obj[key] = new Date(obj[key]);
            }
          }
        };
        parseSpecialTypes(doc);
        return doc;
      });

      // Clear existing records first to avoid duplicates
      try {
        await db.collection(name).drop();
        console.log(`Cleared existing collection ${name}.`);
      } catch (err) {
        // Collection might not exist yet
      }

      await db.collection(name).insertMany(parsedDocs);
      console.log(`Collection ${name} restored successfully!`);
    }

    console.log('Database restore completed successfully!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Restore failed:', err);
    process.exit(1);
  }
};

restore();
