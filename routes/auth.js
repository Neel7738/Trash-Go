const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Redemption = require('../models/Redemption');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const setTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
};

// Rate limiter for login and signup attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login/signup attempts from this IP, please try again after 15 minutes.' }
});

router.post('/signup', authLimiter, async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) return res.status(400).json({ message: 'User already exists' });
        
        const user = await User.create({ name, email, password, role: 'user' });
        const token = generateToken(user._id);
        setTokenCookie(res, token);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token
        });
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

router.post('/login', authLimiter, async (req, res) => {
    let { email, password } = req.body;
    try {
        email = (email || '').toLowerCase();
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.matchPassword(password);

        if (isMatch) {
            const token = generateToken(user._id);
            setTokenCookie(res, token);

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error details:', error.message);
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ ecoPoints: -1 }).limit(3).select('name ecoPoints');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ ecoPoints: -1 }).select('name email ecoPoints createdAt');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

router.post('/redeem', protect, async (req, res) => {
    const { points, reward } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (user.ecoPoints < points) {
            return res.status(400).json({ message: 'Insufficient eco-points' });
        }
        
        user.ecoPoints -= points;
        await user.save();
        
        // Generate a random 8-character alphanumeric code
        const redeemCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        // Create persistent database entry for redemption
        const redemption = new Redemption({
            userId: user._id,
            reward,
            points,
            code: redeemCode
        });
        await redemption.save();
        
        res.json({ 
            message: `Successfully redeemed ${reward}!`,
            redeemCode: redeemCode,
            newPoints: user.ecoPoints 
        });
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

router.get('/redemptions', protect, admin, async (req, res) => {
    try {
        const redemptions = await Redemption.find({})
            .populate('userId', 'name email')
            .sort({ status: 1, createdAt: -1 });
        res.json(redemptions);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

router.put('/redemptions/:id', protect, admin, async (req, res) => {
    try {
        const redemption = await Redemption.findById(req.params.id);
        if (!redemption) {
            return res.status(404).json({ message: 'Redemption not found' });
        }
        
        redemption.status = 'Approved';
        await redemption.save();
        
        res.json({ message: 'Redemption marked as Approved/Disbursed', redemption });
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

module.exports = router;
