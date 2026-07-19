const mongoose = require('mongoose');

const RedemptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reward: { type: String, required: true },
    points: { type: Number, required: true },
    code: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Redemption', RedemptionSchema);
