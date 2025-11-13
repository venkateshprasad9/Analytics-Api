

require('dotenv').config(); 

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const redisClient = require('../utils/cache'); // <-- IMPORT REDIS

let mongoServer;

// Before all tests run
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// After all tests run
afterAll(async () => {
  await mongoose.disconnect();
  await redisClient.quit(); // <-- ADD THIS LINE TO CLOSE REDIS
  
  // Check if mongoServer started before trying to stop it
  if (mongoServer) { // <-- ADD THIS CHECK
    await mongoServer.stop();
  }
});

// Clear all data before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});