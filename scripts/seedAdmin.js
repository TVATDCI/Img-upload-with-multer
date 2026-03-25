import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { env } from '../src/config/index.js';
import { connectDB } from '../src/config/database.js';

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = env.admin.email;
    const adminPassword = env.admin.password;

    if (!adminEmail || !adminPassword) {
      console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      existingAdmin.password = adminPassword;
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Admin password updated successfully!');
    } else {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      console.log('Admin user created successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err.message);
    process.exit(1);
  }
};

seedAdmin();
