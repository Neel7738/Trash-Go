const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');

dotenv.config();
connectDB();

const app = express();

// Security HTTP headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.cloudinary.com", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
            connectSrc: ["'self'", "https://nominatim.openstreetmap.org", "https://generativelanguage.googleapis.com"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// General API Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again later.' }
});

app.use('/api/', generalLimiter);

// Restricted CORS setup
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

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
    if (req.path.includes('.')) {
        res.status(404).send('Not Found');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

const PORT = process.env.PORT || 5000;
app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : (err.message || 'Internal Server Error');
    res.status(statusCode).json({ message });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
