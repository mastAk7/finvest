import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
    pitch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pitch',
        required: true
    },
    investor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    principal: {
        type: Number,
        required: true
    },
    interestAnnualPct: {
        type: Number,
        required: true
    },
    tenureMonths: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'closed'],
        default: 'pending'
    },
    compositeScore: Number,
    isFinal: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Bid = mongoose.model('Bid', bidSchema);

export default Bid;