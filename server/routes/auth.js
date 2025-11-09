import express from 'express';
import { register, login, logout, currentUser, makeGoogleVerifier } from '../controllers/authController.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', currentUser);

// Google ID token verification endpoint (client obtains id_token and POSTs it here)
const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.warn('GOOGLE_CLIENT_ID not set; /auth/google endpoint will fail until configured.');
}
router.post('/google', makeGoogleVerifier(googleClientId));

export default router;
