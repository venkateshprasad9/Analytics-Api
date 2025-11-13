

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const App = require('../models/appModel');

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

// --- Import Real Routes ---
const authRoutes = require('../routes/authRoutes');
app.use('/api/auth', authRoutes);

// --- Test Suite ---
describe('Auth API Endpoints', () => {
  let agent;
  let testUser;
  let testApp;

  
 
  beforeEach(async () => {
    // 1. Create a fresh user
    testUser = new User({
      googleId: '123456789',
      displayName: 'Test User',
      email: 'test@example.com',
    });
    await testUser.save();

    // 2. Create a fresh agent
    agent = request.agent(app);

    // 3. Log in the agent
    const loginRes = await agent
      .post('/api/auth/mock-login')
      .send({ userId: testUser._id.toString() });
    expect(loginRes.statusCode).toBe(200); 

    // 4. Create a fresh app
    testApp = new App({
      owner: testUser._id,
      name: 'Test App',
      url: 'https://test.com',
      apiKey: 'key_test123',
    });
    await testApp.save();
  });

  // --- The Actual Tests ---

  it('GET /api/auth/status - should return 200 for logged-in user', async () => {
    const res = await agent.get('/api/auth/status');
    expect(res.statusCode).toEqual(200);
    expect(res.body.user.email).toEqual('test@example.com');
  });

  it('GET /api/auth/status - should return 401 for non-logged-in user', async () => {
    const res = await request(app).get('/api/auth/status');
    expect(res.statusCode).toEqual(401);
  });

  it('POST /api/auth/register - should register a new app', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({
        name: 'My New Awesome App',
        url: 'https://newapp.com',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.app.name).toEqual('My New Awesome App');
  });

  it('GET /api/auth/api-key - should get the user\'s apps', async () => {
    const res = await agent.get('/api/auth/api-key');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toEqual('Test App');
  });

  it('POST /api/auth/revoke - should revoke an app\'s API key', async () => {
    const res = await agent
      .post('/api/auth/revoke')
      .send({
        appId: testApp._id.toString(),
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('revoked');
  });
});