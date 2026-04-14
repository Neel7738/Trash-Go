const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error details:');
        console.error(err);
        process.exit(1);
    }
};

module.exports = connectDB;
