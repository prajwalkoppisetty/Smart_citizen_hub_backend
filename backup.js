const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_citizen_hub';

const backup = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to local MongoDB database...');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const dump = {};

    for (const col of collections) {
      const name = col.name;
      // Skip system collections
      if (name.startsWith('system.')) continue;
      
      console.log(`Exporting collection: ${name}...`);
      const docs = await db.collection(name).find({}).toArray();
      dump[name] = docs;
    }

    fs.writeFileSync('./db_dump.json', JSON.stringify(dump, null, 2));
    console.log('Database backup successfully written to ./db_dump.json!');
    
    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
};

backup();
