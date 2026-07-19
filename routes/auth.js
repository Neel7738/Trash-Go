const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Redemption = require('../models/Redemption');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });
        
        const user = await User.create({ name, email, password, role: 'user' });
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    try {
        console.log(`Login attempt for email: "${email}"`);
        email = email.toLowerCase();
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`User not found: "${email}"`);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.matchPassword(password);
        console.log(`Password match for "${email}": ${isMatch}`);

        if (isMatch) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ ecoPoints: -1 }).limit(3).select('name ecoPoints');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ ecoPoints: -1 }).select('name email ecoPoints createdAt');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
    }
});

router.get('/redemptions', protect, admin, async (req, res) => {
    try {
        const redemptions = await Redemption.find({})
            .populate('userId', 'name email')
            .sort({ status: 1, createdAt: -1 });
        res.json(redemptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
