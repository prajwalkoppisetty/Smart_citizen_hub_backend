require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/Users');

const fieldOfficers = [
  {
    name: 'Rajesh Kumar',
    email: 'rajesh@smartcitizen.gov.in',
    password: 'password123',
    phonenumber: '9876555432',
    role: 'field_officer',
    isVerified: true,
    ward: 'Ward 12, Park Circus',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256'
  },
  {
    name: 'Amit Sharma',
    email: 'amit@smartcitizen.gov.in',
    password: 'password123',
    phonenumber: '9876555433',
    role: 'field_officer',
    isVerified: true,
    ward: 'Ward 12, Park Circus',
    profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256'
  },
  {
    name: 'Vikram Sethi',
    email: 'vikram@smartcitizen.gov.in',
    password: 'password123',
    phonenumber: '9876555434',
    role: 'field_officer',
    isVerified: true,
    ward: 'Ward 12, Park Circus',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256'
  },
  {
    name: 'Karan Mehta',
    email: 'karan@smartcitizen.gov.in',
    password: 'password123',
    phonenumber: '9876555435',
    role: 'field_officer',
    isVerified: true,
    ward: 'Ward 12, Park Circus',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256'
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const officer of fieldOfficers) {
      const exists = await User.findOne({ email: officer.email });
      if (!exists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(officer.password, salt);
        
        await User.create({
          ...officer,
          password: hashedPassword
        });
        console.log(`Successfully added Field Officer: ${officer.name}`);
      } else {
        console.log(`Field Officer already exists: ${officer.name}`);
      }
    }
  } catch (err) {
    console.error('Error seeding field officers:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

seed();
