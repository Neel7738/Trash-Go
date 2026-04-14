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
            console.log('NO USERS FOUND. Attempting to create admin now...');
            const admin = await User.create({
                name: 'System Admin',
                email: 'admin@trashgo.com',
                password: 'admin123',
                role: 'admin'
            });
            console.log('Admin created successfully in this DB.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

findAdminEverywhere();
