import mongoose from 'mongoose';

const pitchSchema = new mongoose.Schema({
    borrower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalText: {
        type: String,
        required: true
    },
    professionalPitch: {
        type: String,
        required: true
    },
    extractedInfo: {
        loanAmount: String,
        purpose: String,
        businessType: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'offer_sent'],
        default: 'pending'
    },
    finalOffer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Pitch = mongoose.model('Pitch', pitchSchema);

export default Pitch;