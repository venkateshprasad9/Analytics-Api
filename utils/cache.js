
const Redis = require('ioredis');

// This code automatically reads the REDIS_HOST, REDIS_PORT,
// and REDIS_PASSWORD from your .env file.
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3, // Optional: retry settings
});

redisClient.on('connect', () => {
  console.log('Redis client connected.');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  
});

module.exports = redisClient;