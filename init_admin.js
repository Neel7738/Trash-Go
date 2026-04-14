const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for admin setup...');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@trashgo.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const adminExists = await User.findOne({ email: adminEmail });
        if (adminExists) {
            console.log(`Admin user with email ${adminEmail} already exists.`);
            // Update role to admin and RESET password to match .env
            adminExists.role = 'admin';
            adminExists.password = adminPassword; // User model handles hashing on save
            await adminExists.save();
            console.log('Admin role and password confirmed/updated.');
        } else {
            const admin = await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin'
            });
            console.log('Admin user created successfully!');
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    } catch (err) {
        console.error('Error creating admin user:', err);
        process.exit(1);
    }
};

createAdmin();
