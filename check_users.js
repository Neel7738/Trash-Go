const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const findAdminEverywhere = async () => {
    try {
        console.log('Using URI:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to:', mongoose.connection.name);

        const users = await User.find({});
        console.log(`Found ${users.length} users in current DB:`);
        users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));

        if (users.length === 0) {
            console.log('NO USERS FOUND.');
            const adminPassword = process.env.ADMIN_PASSWORD;
            if (adminPassword) {
                console.log('Attempting to create admin now...');
                const admin = await User.create({
                    name: 'System Admin',
                    email: process.env.ADMIN_EMAIL || 'admin@trashgo.com',
                    password: adminPassword,
                    role: 'admin'
                });
                console.log('Admin created successfully in this DB.');
            } else {
                console.log('Set ADMIN_PASSWORD in .env to create initial admin user.');
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

findAdminEverywhere();
