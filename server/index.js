import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { connectDB } from './config/db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Allow multiple origins for CORS
const allowedOrigins = process.env.CLIENT_ORIGIN 
    ? process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'];

app.use(cors({ 
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.static('public'));

// Session configuration
// Determine if we should use secure cookies (only for HTTPS)
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isLocalhost = clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1');
// Only use secure cookies in production AND when not using localhost
const useSecureCookie = isProduction && !isLocalhost;

// Parse client origins for cookie domain configuration
const clientOrigins = clientOrigin.split(',').map(origin => origin.trim());
const isVercelDeployment = clientOrigins.some(origin => origin.includes('vercel.app'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: 'lax', // Allows cookies to be sent with cross-site requests
      secure: useSecureCookie, // Only use secure cookies in production HTTPS
      httpOnly: true, // Prevents JavaScript access to cookie
      // Don't set domain - let browser handle it automatically for cross-origin
    },
    name: 'finvest.sid'
  })
);

// Import auth middleware
import { attachUser } from './middleware/auth.js';

// Attach user to session if authenticated
app.use(attachUser);

// connect DB
if (!process.env.DB_URL) {
  console.warn('DB_URL not set in env - Mongo connection will likely fail');
}
connectDB(process.env.DB_URL).catch(() => {});

// Import routes
import pitchRoutes from './routes/pitch.js';
import bidRoutes from './routes/bids.js';

// Routes
app.use('/auth', authRoutes);
app.use('/pitch', pitchRoutes);
app.use('/bids', bidRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
