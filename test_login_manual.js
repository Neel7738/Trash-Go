const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const testLoginManual = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'admin@trashgo.com';
        const password = 'admin123';

        const user = await User.findOne({ email });
        if (!user) {
            console.log('Admin not found!');
        } else {
            const isMatch = await user.matchPassword(password);
            console.log(`Password 'admin123' for 'admin@trashgo.com' match: ${isMatch}`);
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

testLoginManual();
