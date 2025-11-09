import express from 'express';
import Bid from '../models/bid.js';
import fetch from 'node-fetch';

const router = express.Router();
const SELECTOR_API_URL = process.env.SELECTOR_API_URL || 'http://localhost:5002';

router.post('/:pitchId/submit', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Please log in to submit a bid' });
        }

        if (req.session.user.accountType !== 'investor') {
            return res.status(403).json({ error: 'Only investors can submit bids' });
        }

        const { principal, interestAnnualPct, tenureMonths } = req.body;
        const pitchId = req.params.pitchId;
        const investorId = req.session.user._id;

        // Validate bid data
        if (!principal || !interestAnnualPct || !tenureMonths) {
            return res.status(400).json({ error: 'Missing required bid information' });
        }

        // Check if investor already has a bid for this pitch
        const existingBid = await Bid.findOne({
            pitch: pitchId,
            investor: investorId,
            status: { $in: ['pending', 'closed'] }
        });

        let bid;
        if (existingBid) {
            // Update existing bid
            existingBid.principal = principal;
            existingBid.interestAnnualPct = interestAnnualPct;
            existingBid.tenureMonths = tenureMonths;
            existingBid.status = 'pending';
            existingBid.isFinal = false;
            existingBid.compositeScore = undefined;
            await existingBid.save();
            bid = existingBid;
        } else {
            // Create new bid
            bid = new Bid({
                pitch: pitchId,
                investor: investorId,
                principal,
                interestAnnualPct,
                tenureMonths,
                status: 'pending'
            });
            await bid.save();
        }

        // Return the bid
        res.json({
            success: true,
            message: existingBid ? 'Bid updated successfully' : 'Bid submitted successfully',
            bid: bid
        });
    } catch (err) {
        console.error('Bid submission error:', err);
        res.status(500).json({ error: 'Failed to submit bid' });
    }
});

router.get('/:pitchId', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Please log in to view bids' });
        }

        const pitchId = req.params.pitchId;
        
        // Fetch all pending bids for this pitch with investor details
        // Only show pending bids (not closed or rejected)
        const bids = await Bid.find({ 
            pitch: pitchId,
            status: { $in: ['pending', 'accepted'] }
        })
            .populate('investor', 'name email')
            .sort({ createdAt: -1 });

        // If there are bids, get them ranked
        if (bids.length > 0) {
            try {
                // Format bids for the selector model (matching offers.json format)
                const formattedBids = bids.map(bid => ({
                    investor_id: bid.investor._id.toString(),
                    principal: bid.principal,
                    interest_annual_pct: bid.interestAnnualPct,
                    tenure_months: bid.tenureMonths
                }));

                // Get rankings from selector service
                const response = await fetch(`${SELECTOR_API_URL}/rank`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formattedBids)
                });

                if (response.ok) {
                    const rankedOffers = await response.json();
                    
                    // Merge rankings with bid data
                    bids.forEach(bid => {
                        const rankedOffer = rankedOffers.find(r => r.investor_id === bid.investor._id.toString());
                        if (rankedOffer && rankedOffer.composite_score !== undefined) {
                            bid.compositeScore = rankedOffer.composite_score;
                        }
                    });

                    // Sort by composite score (descending - best first)
                    bids.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
                } else {
                    console.warn('Selector service returned non-OK response:', response.status);
                }
            } catch (err) {
                console.error('Error ranking bids:', err);
                // Continue without rankings if selector service fails
            }
        }

        res.json({ bids });
    } catch (err) {
        console.error('Error fetching bids:', err);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

router.post('/:bidId/final', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Please log in to send offers' });
        }

        const bid = await Bid.findById(req.params.bidId)
            .populate('pitch')
            .populate('investor');

        if (!bid) {
            return res.status(404).json({ error: 'Bid not found' });
        }

        // Check if there's already a final offer for this pitch
        const existingFinalBid = await Bid.findOne({
            pitch: bid.pitch._id,
            isFinal: true,
            _id: { $ne: bid._id }
        });

        if (existingFinalBid) {
            return res.status(400).json({ error: 'A final offer has already been sent for this pitch' });
        }

        // Import Pitch model
        const Pitch = (await import('../models/pitch.js')).default;

        // Close all other bids for this pitch
        await Bid.updateMany(
            {
                pitch: bid.pitch._id,
                _id: { $ne: bid._id },
                status: 'pending'
            },
            { status: 'closed' }
        );

        // Mark this bid as final and sent to borrower
        bid.isFinal = true;
        bid.status = 'pending'; // Keep as pending until borrower accepts
        await bid.save();

        // Update pitch status and store final offer
        const pitch = await Pitch.findById(bid.pitch._id);
        if (pitch) {
            pitch.status = 'offer_sent';
            pitch.finalOffer = bid._id;
            await pitch.save();
        }

        res.json({
            success: true,
            message: 'Offer sent to borrower successfully. All other bids have been closed.',
            bid: bid,
            pitch: pitch
        });
    } catch (err) {
        console.error('Error sending final offer:', err);
        res.status(500).json({ error: 'Failed to send offer' });
    }
});

router.post('/:bidId/accept', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Please log in to accept bids' });
        }

        const bid = await Bid.findById(req.params.bidId)
            .populate('pitch')
            .populate('investor');

        if (!bid) {
            return res.status(404).json({ error: 'Bid not found' });
        }

        // Only borrower of the pitch can accept bids
        if (!bid.pitch.borrower.equals(req.session.user._id)) {
            return res.status(403).json({ error: 'Only the borrower can accept bids' });
        }

        // Import Pitch model
        const Pitch = (await import('../models/pitch.js')).default;

        // Update bid status
        bid.status = 'accepted';
        await bid.save();

        // Reject all other bids for this pitch
        await Bid.updateMany(
            { 
                pitch: bid.pitch._id,
                _id: { $ne: bid._id }
            },
            { status: 'rejected' }
        );

        // Update pitch status to approved
        const pitch = await Pitch.findById(bid.pitch._id);
        if (pitch) {
            pitch.status = 'approved';
            await pitch.save();
        }

        res.json({
            success: true,
            message: 'Bid accepted successfully',
            bid: bid,
            pitch: pitch
        });
    } catch (err) {
        console.error('Error accepting bid:', err);
        res.status(500).json({ error: 'Failed to accept bid' });
    }
});

export default router;