const express = require('express');
const Report = require('../models/Report');
const { protect, admin } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// User: Submit report
router.post('/', protect, upload.single('image'), async (req, res) => {
    const { description } = req.body;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    try {
        // Find reports within a small radius (~111m) to increase priority
        const radius = 0.001; 
        const nearbyReports = await Report.find({
            latitude: { $gte: latitude - radius, $lte: latitude + radius },
            longitude: { $gte: longitude - radius, $lte: longitude + radius },
            status: { $ne: 'Completed' }
        });

        // AI Waste Scanning
        let aiAnalysis = { isGarbage: true, category: 'General', severity: 'Low' };
        if (process.env.GEMINI_API_KEY) {
            try {
                console.log('Sending image to Gemini for waste scanning analysis...');
                const imageRes = await fetch(req.file.path);
                const imageBuffer = await imageRes.arrayBuffer();

                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    generationConfig: { responseMimeType: 'application/json' }
                });

                const prompt = `Analyze this image of reported litter/garbage. Respond in JSON matching this schema:
{
  "isGarbage": true/false (true if the image actually contains garbage, litter, or waste, false otherwise),
  "category": "Plastic" | "Metal" | "Electronic" | "Paper" | "Biohazard" | "General" (choose the most fitting category),
  "severity": "Low" | "Medium" | "High" (Low for single bottles/cups, Medium for small piles, High for large dumps/blockages)
}`;

                const imagePart = {
                    inlineData: {
                        data: Buffer.from(imageBuffer).toString('base64'),
                        mimeType: 'image/jpeg'
                    }
                };

                const result = await model.generateContent([prompt, imagePart]);
                const responseText = result.response.text();
                console.log('Gemini Scan Result:', responseText);
                const parsed = JSON.parse(responseText);
                if (parsed && typeof parsed.isGarbage === 'boolean') {
                    aiAnalysis = parsed;
                }
            } catch (err) {
                console.error('Gemini AI Scan failed:', err.message);
            }
        }

        // Validate if image actually contains garbage
        if (!aiAnalysis.isGarbage) {
            return res.status(400).json({ message: 'The uploaded image does not appear to contain garbage or waste. Please upload a clear photo of the litter to log a discovery.' });
        }

        // Calculate severity weight (Low = +1, Medium = +3, High = +5)
        let severityWeight = 1;
        if (aiAnalysis.severity === 'Medium') severityWeight = 3;
        if (aiAnalysis.severity === 'High') severityWeight = 5;

        const reportPriority = nearbyReports.length + severityWeight;

        const report = new Report({
            userId: req.user._id,
            imageUrl: req.file.path,
            description,
            latitude,
            longitude,
            priority: reportPriority,
            category: aiAnalysis.category,
            aiSeverity: aiAnalysis.severity,
            isGarbage: aiAnalysis.isGarbage
        });

        // Increment priority for all nearby reports as well
        if (nearbyReports.length > 0) {
            await Report.updateMany(
                { _id: { $in: nearbyReports.map(r => r._id) } },
                { $inc: { priority: 1 } }
            );
        }

        const createdReport = await report.save();

        // Award points for reporting (Base: 10 pts + extra points for severity)
        let earnedPoints = 10;
        if (aiAnalysis.severity === 'Medium') earnedPoints += 5; // Medium: 15 pts total
        if (aiAnalysis.severity === 'High') earnedPoints += 10;  // High: 20 pts total

        req.user.ecoPoints += earnedPoints;
        await req.user.save();

        res.status(201).json(createdReport);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// Admin: Get all reports (sorted by priority)
router.get('/', protect, admin, async (req, res) => {
    try {
        const reports = await Report.find({}).populate('userId', 'name email ecoPoints').sort({ priority: -1, createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// User/Admin: Get basic heatmap data
router.get('/heatmap', async (req, res) => {
    try {
        const reports = await Report.find({ status: { $ne: 'Completed' } }).select('latitude longitude priority');
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// Admin: Get reports grouped logically by 110-meter radius
router.get('/grouped', protect, admin, async (req, res) => {
    try {
        const reports = await Report.find({}).populate('userId', 'name email ecoPoints').sort({ createdAt: -1 });

        const clusters = [];
        for (const report of reports) {
            let clustered = false;
            for (const cluster of clusters) {
                const latDiff = Math.abs(cluster.lat - report.latitude);
                const lngDiff = Math.abs(cluster.lng - report.longitude);
                if (latDiff <= 0.001 && lngDiff <= 0.001) {
                    cluster.reports.push(report);
                    clustered = true;
                    break;
                }
            }
            if (!clustered) {
                clusters.push({
                    id: Math.random().toString(36).substr(2, 9),
                    lat: report.latitude,
                    lng: report.longitude,
                    locationName: '',
                    reports: [report]
                });
            }
        }

        for (const cluster of clusters) {
            try {
                const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${cluster.lat}&lon=${cluster.lng}`, {
                    headers: { 'User-Agent': 'TrashGo-Nodejs-App/1.0' }
                });
                const data = await resp.json();
                cluster.locationName = data.address?.city || data.address?.town || data.address?.suburb || data.address?.county || "Unknown Area";
            } catch (err) {
                console.error("Geocoding error:", err.message);
                cluster.locationName = "Unknown Area";
            }
        }

        res.json(clusters);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// User: Get own reports
router.get('/myreports', protect, async (req, res) => {
    try {
        const reports = await Report.find({ userId: req.user._id });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// User: Rate a completed report
router.put('/:id/rate', protect, async (req, res) => {
    try {
        const { rating } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'A valid rating between 1 and 5 is required.' });
        }

        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only rate your own reports.' });
        }

        if (report.status !== 'Completed') {
            return res.status(400).json({ message: 'You can only rate completed reports.' });
        }

        if (report.rating) {
            return res.status(400).json({ message: 'You have already rated this cleanup.' });
        }

        report.rating = rating;
        await report.save();

        // Gamification: Award 5 points for leaving feedback
        const User = require('../models/User');
        const user = await User.findById(req.user._id);
        if (user) {
            user.ecoPoints += 5;
            await user.save();
        }

        res.json({ message: 'Thank you for your feedback! Earned 5 Eco-Points.', report });
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// Admin: Update report status
router.put('/:id', protect, admin, upload.single('cleanedImage'), async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (report) {
            const currentStatus = report.status;
            const newStatus = req.body.status;

            if (currentStatus === 'Completed' && newStatus !== 'Completed') {
                return res.status(400).json({ message: 'A completed report cannot be changed back to another status.' });
            }

            if (currentStatus === 'In Progress' && newStatus === 'Pending') {
                return res.status(400).json({ message: 'An "In Progress" report cannot be moved back to "Pending".' });
            }

            if (newStatus && newStatus !== currentStatus) {
                // Extra check for image when moving to Completed
                if (newStatus === 'Completed') {
                    if (req.file) {
                        report.cleanedImageUrl = req.file.path;
                    } else if (!report.cleanedImageUrl) {
                        return res.status(400).json({ message: 'Cleaning completion image is required to complete report' });
                    }

                    // Award points to the user who created the report
                    const User = require('../models/User');
                    const creator = await User.findById(report.userId);
                    if (creator) {
                        creator.ecoPoints += 50;
                        await creator.save();
                    }
                }
                
                report.status = newStatus;
            }

            const updatedReport = await report.save();
            res.json(updatedReport);
        } else {
            res.status(404).json({ message: 'Report not found' });
        }
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// Admin: Delete report
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (report) {
            if (report.status !== 'Completed') {
                return res.status(400).json({ message: 'Only Completed reports can be deleted' });
            }
            await report.deleteOne();
            res.json({ message: 'Report removed' });
        } else {
            res.status(404).json({ message: 'Report not found' });
        }
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// User: Get unnotified completed reports (alerts)
router.get('/notifications', protect, async (req, res) => {
    try {
        const reports = await Report.find({
            userId: req.user._id,
            status: 'Completed',
            notified: { $ne: true }
        });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

// User: Acknowledge completed reports notifications
router.put('/notifications/ack', protect, async (req, res) => {
    try {
        await Report.updateMany(
            { userId: req.user._id, status: 'Completed', notified: { $ne: true } },
            { notified: true }
        );
        res.json({ message: 'Notifications acknowledged' });
    } catch (error) {
        res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message });
    }
});

module.exports = router;
