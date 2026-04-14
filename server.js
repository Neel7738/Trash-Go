const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Default route for frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For any other route that doesn't match an API or static file
app.get(/.*/, (req, res) => {
    // If it's a direct file request that wasn't caught by express.static, let it be 404
    // or if you want SPA behavior for subroutes:
    if (req.path.includes('.')) {
        res.status(404).send('Not Found');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
