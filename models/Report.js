const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, required: true },
    cleanedImageUrl: { type: String },
    description: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    priority: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    rating: { type: Number, min: 1, max: 5 },
    category: { type: String, default: 'General' },
    aiSeverity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    isGarbage: { type: Boolean, default: true },
    notified: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema);
