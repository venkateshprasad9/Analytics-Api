

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');

// --- Import Models ---
const User = require('../models/userModel');
const App = require('../models/appModel');
const Event = require('../models/eventModel');

// --- Minimal App Setup ---
const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- Mock Passport ---
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// --- Mock Login Route (Helper) ---
app.post('/api/auth/mock-login', async (req, res, next) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).send('Mock user not found');
    req.login(user, (err) => {
      if (err) return res.status(500).send(err);
      res.status(200).send('Logged in');
    });
  } catch (err) {
    next(err);
  }
});

// --- Import Routes ---
const authRoutes = require('../routes/authRoutes');
const analyticsRoutes = require('../routes/analyticsRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- Test Suite ---
describe('Analytics API Endpoints', () => {
  let agent; // The "logged-in user" agent
  let testUser;
  let testApp;
  let validApiKey;

  
 
  beforeEach(async () => {
    // 1. Create a fresh user
    testUser = new User({
      googleId: '987654',
      displayName: 'Analytics User',
      email: 'analytics@example.com',
    });
    await testUser.save();

    // 2. Create a fresh agent
    agent = request.agent(app);

    // 3. Log in the agent
    const loginRes = await agent
      .post('/api/auth/mock-login')
      .send({ userId: testUser._id.toString() });
    expect(loginRes.statusCode).toBe(200); // Check login

    // 4. Create a fresh app
    testApp = new App({
      owner: testUser._id,
      name: 'Analytics Test App',
      url: 'https://analytics-test.com',
      apiKey: 'key_analytics123',
    });
    await testApp.save();
    validApiKey = testApp.apiKey;

    // 5. Create fresh test events
    await Event.create([
      {
        app: testApp._id,
        event: 'page_visit',
        userId: 'user-1',
        device: 'desktop',
      },
      {
        app: testApp._id,
        event: 'page_visit',
        userId: 'user-2',
        device: 'mobile',
      },
    ]);
  });

  // --- /api/analytics/collect Endpoint Tests ---
  describe('POST /api/analytics/collect', () => {
    it('should reject requests without an API key', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .send({ event: 'test_event' });
      expect(res.statusCode).toEqual(401);
    });

    it('should reject requests with an invalid API key', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('X-API-KEY', 'key_invalid123')
        .send({ event: 'test_event' });
      expect(res.statusCode).toEqual(403);
    });

    it('should accept a valid event with a valid API key', async () => {
      const eventData = {
        event: 'cta_click',
        url: 'https://analytics-test.com/pricing',
        userId: 'user-3',
        device: 'mobile',
      };
      
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('X-API-KEY', validApiKey)
        .send(eventData);
        
      
      expect(res.statusCode).toEqual(202);
      expect(res.body.message).toEqual('Event accepted.');
    });
  });

  // --- /api/analytics/event-summary Endpoint Tests ---
  describe('GET /api/analytics/event-summary', () => {
    it('should reject if user is not logged in', async () => {
      const res = await request(app)
        .get('/api/analytics/event-summary')
        .query({ event: 'page_visit' });
      expect(res.statusCode).toEqual(401);
    });

    it('should require an "event" query parameter', async () => {
      const res = await agent
        .get('/api/analytics/event-summary');
      
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('"event" is required');
    });

    it('should return a valid summary for "page_visit"', async () => {
      const res = await agent
        .get('/api/analytics/event-summary')
        .query({ event: 'page_visit' });
      
     
      expect(res.statusCode).toEqual(200);
      expect(res.body.event).toEqual('page_visit');
      expect(res.body.count).toEqual(2);
      expect(res.body.uniqueUsers).toEqual(2);
    });
  });
});