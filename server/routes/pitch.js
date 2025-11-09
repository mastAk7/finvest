import express from 'express';
import fetch from 'node-fetch';
import Pitch from '../models/pitch.js';

const router = express.Router();
const MODEL_API_URL = process.env.MODEL_API_URL || 'https://finvest-2p2y.onrender.com';

router.post('/generate', async (req, res) => {
    try {
        const { slangText } = req.body;
        if (!slangText) {
            return res.status(400).json({ error: 'Slang text is required' });
        }

        console.log('Sending request to Flask API:', { slangText });

        // Call the Flask API
        const response = await fetch(`${MODEL_API_URL}/generate-pitch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: slangText })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `Model API returned status ${response.status}` };
            }
            throw new Error(errorData.error || 'Failed to generate pitch');
        }

        const result = await response.json();
        console.log('Received response from Flask API:', result);

        if (!result.success) {
            throw new Error(result.error || 'Failed to generate pitch');
        }

        // Send the generated pitch back to the client
        res.json(result.data);
    } catch (err) {
        console.error('Pitch generation error:', err);
        // Check if it's a connection error
        if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
            return res.status(503).json({ 
                error: 'Model service is currently unavailable. Please try again in a moment.',
                details: 'The pitch generation service may be starting up or temporarily down.'
            });
        }
        res.status(500).json({ 
            error: err.message || 'Failed to generate pitch'
        });
    }
});

// Submit a pitch to be saved in the database
router.post('/submit', async (req, res) => {
    try {
        // Debug log to check session state
        console.log('Submit pitch - Session state:', {
            hasSession: !!req.session,
            sessionID: req.sessionID,
            hasUserId: !!req.session?.userId,
            hasUser: !!req.session?.user,
            userId: req.session?.userId,
            cookies: Object.keys(req.cookies || {})
        });

        // Check if user is authenticated
        if (!req.session?.user && !req.session?.userId) {
            console.log('No user in session for submit');
            return res.status(401).json({ error: 'Please log in to submit a pitch' });
        }

        // If we have userId but no user object, try to fetch it
        if (req.session?.userId && !req.session?.user) {
            const User = (await import('../models/User.js')).default;
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                req.session.user = user;
            } else {
                return res.status(401).json({ error: 'Session expired. Please log in again.' });
            }
        }

        const { professionalPitch, originalText, extractedInfo } = req.body;

        if (!professionalPitch) {
            return res.status(400).json({ error: 'Professional pitch is required' });
        }

        // Create new pitch document
        const pitch = new Pitch({
            borrower: req.session.user._id,
            originalText,
            professionalPitch,
            extractedInfo: {
                loanAmount: extractedInfo?.loan_amount || 'Not specified',
                purpose: extractedInfo?.purpose || 'Not specified',
                businessType: extractedInfo?.business_type || 'Not specified'
            },
            status: 'pending'
        });

        // Save to database
        await pitch.save();

        res.json({
            success: true,
            message: 'Pitch submitted successfully',
            pitch: pitch
        });

    } catch (err) {
        console.error('Pitch submission error:', err);
        res.status(500).json({ 
            error: 'Failed to submit pitch',
            details: err.message
        });
    }
});

// Get all pitches (for investors)
router.get('/list', async (req, res) => {
    try {
        // Debug session state
        console.log('Session check:', {
            hasSession: !!req.session,
            hasUserId: !!req.session?.userId,
            hasUser: !!req.session?.user,
            accountType: req.session?.user?.accountType
        });

        // Check if user is authenticated and is an investor
        if (!req.session.user) {
            console.log('No user in session');
            return res.status(401).json({ error: 'Please log in to view pitches' });
        }
        
        if (req.session.user.accountType !== 'investor') {
            console.log('User is not an investor:', req.session.user.accountType);
            return res.status(403).json({ error: 'Only investors can view all pitches' });
        }

        const pitches = await Pitch.find().sort({ createdAt: -1 });
        console.log(`Found ${pitches.length} pitches`);
        res.json({ pitches });
    } catch (err) {
        console.error('Error fetching pitches:', err);
        res.status(500).json({ error: 'Failed to fetch pitches' });
    }
});

// Get my pitches (for borrowers)
router.get('/my-pitches', async (req, res) => {
    try {
        // Debug session state
        console.log('My pitches - Session check:', {
            hasSession: !!req.session,
            sessionID: req.sessionID,
            hasUserId: !!req.session?.userId,
            hasUser: !!req.session?.user,
            userId: req.session?.userId
        });

        // Check if user is authenticated
        if (!req.session?.user && !req.session?.userId) {
            console.log('No user in session for my-pitches');
            return res.status(401).json({ error: 'Please log in to view your pitches' });
        }

        // If we have userId but no user object, try to fetch it
        if (req.session?.userId && !req.session?.user) {
            const User = (await import('../models/User.js')).default;
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                req.session.user = user;
            } else {
                return res.status(401).json({ error: 'Session expired. Please log in again.' });
            }
        }

        const Bid = (await import('../models/bid.js')).default;

        const pitches = await Pitch.find({ borrower: req.session.user._id })
            .populate('finalOffer')
            .sort({ createdAt: -1 });

        // Populate final offer details if it exists
        for (let pitch of pitches) {
            if (pitch.finalOffer) {
                await pitch.populate({
                    path: 'finalOffer',
                    populate: {
                        path: 'investor',
                        select: 'name email'
                    }
                });
            }
        }

        res.json({ pitches });
    } catch (err) {
        console.error('Error fetching user pitches:', err);
        res.status(500).json({ error: 'Failed to fetch your pitches' });
    }
});

export default router;