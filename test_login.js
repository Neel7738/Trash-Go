const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const email = process.env.ADMIN_EMAIL || 'admin@trashgo.com';
        const password = process.env.ADMIN_PASSWORD || 'admin123';

        console.log(`Testing login for: ${email} with password: ${password}`);

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('User not found in database.');
        } else {
            console.log('User found. Comparing passwords...');
            const isMatch = await user.matchPassword(password);
            console.log(`Password match result: ${isMatch}`);
            
            if (!isMatch) {
                console.log('Stored hashed password:', user.password);
                // Manual check
                const bcrypt = require('bcryptjs');
                const manualMatch = await bcrypt.compare(password, user.password);
                console.log(`Manual bcrypt compare result: ${manualMatch}`);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
};

testLogin();
