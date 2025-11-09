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

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ 
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.static('public'));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
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
