
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');

// --- Load Environment Variables ---
dotenv.config();

// --- Local Imports ---
const connectDB = require('./utils/db');
const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const rateLimiter = require('./utils/rateLimiter');

// --- Initialize Express App ---
const app = express();

// --- Database Connection ---
connectDB();

// --- Middleware Setup ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORS Configuration (Production Ready) ---
app.use(
  cors({
    origin: process.env.RENDER_EXTERNAL_URL, 
    credentials: true, 
  })
);

app.use(helmet());
app.use(morgan('dev'));

// --- Session Configuration (Production Ready) ---

app.set('trust proxy', 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true, 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());
require('./utils/passportConfig');

// --- Apply Rate Limiting ---
app.use('/api/', rateLimiter); 

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// --- 404 Error Handler ---
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// --- Start Server ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});