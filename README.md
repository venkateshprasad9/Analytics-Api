# Scalable Website Analytics API

This is the backend API for a scalable website analytics application, built as part of an assignment.

The API is built with Node.js, Express, MongoDB, and Redis. It's designed to handle high-volume event ingestion and provide fast, aggregated analytics. The application is containerized with Docker and deployed on Render.

---

## 🚀 Live URLs

* **Deployment URL:** `https://venky-analytics-api.onrender.com`
* **API Documentation (Postman):** `https://documenter.getpostman.com/view/26851597/2sB3WvMJHW`
* **Health Check:** `https://venky-analytics-api.onrender.com/health`
* **Primary Entry Point:** `https://venky-analytics-api.onrender.com/api/auth/google`
---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB (using MongoDB Atlas)
* **Cache:** Redis (using Redis Cloud)
* **Authentication:** Google OAuth 2.0 (using Passport.js)
* **API Key Management:** UUID for secure key generation
* **Deployment:** Render (using Docker)
* **Testing:** Jest & Supertest
* **Validation:** Joi

---

## 🌟 Key Features

* **Google Auth Onboarding:** Users (developers) can sign up and log in securely with their Google accounts.
* **API Key Management:** Logged-in users can register their apps, and generate, revoke, and regenerate API keys.
* **High-Throughput Event Collection:** A `POST /api/analytics/collect` endpoint, secured by API key, for ingesting millions of events.
* **Cached Analytics:** `GET` endpoints for event summaries and user stats are cached with Redis for 5-minute intervals to reduce database load.
* **Security:** Implements rate limiting, `helmet` for HTTP header security, and `cors` for production environments.

---

## ⚙️ Instructions to Run Project Locally

### 1. Prerequisites

* [Node.js](https://nodejs.org/) (v18+)
* [Git](https://git-scm.com/)
* A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
* A free [Redis Cloud](https://redis.com/try-free) account
* A [Google Cloud](https://console.cloud.google.com/) project for OAuth keys

### 2. Clone the Repository


git clone [https://github.com/venkateshprasad9/Analytics-Api.git](https://github.com/venkateshprasad9/Analytics-Api.git)
cd Analytics-Api

### 3. Install Dependencies
npm install

### 4. Set Up Environment Variables
Create a .env file in the root of the project and add the following variables:



### Server
NODE_ENV=development
PORT=3000
SESSION_SECRET=a_very_long_and_random_secret_string

### MongoDB (from MongoDB Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>

### Redis (from Redis Cloud)
REDIS_HOST=<your-redis-host>
REDIS_PORT=<your-redis-port>
REDIS_PASSWORD=<your-redis-password>

#### Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
CALLBACK_URL=http://localhost:3000/api/auth/google/callback

### 5. Run the Server
npm run dev

### 6. Run the Tests
npm test

# Testing & Authentication Notes 

### Cookie Authentication Method (For All Protected Routes)
Since this is a Google OAuth flow, sessions are managed via cookies, which Postman cannot generate automatically.

To test any protected developer route (/api/auth/register, /api/analytics/event-summary, etc.) in Postman, follow these steps to retrieve the session cookie:

Open your browser and visit the Primary Entry Point (/api/auth/google) to log in.

After the redirect, open Developer Tools (F12), navigate to the Application tab, and copy the connect.sid cookie value from http://localhost:3000.

In Postman, set a header for the desired request:

### KEY: Cookie

### VALUE: connect.sid=PASTE_COPIED_VALUE

All tests requiring user authentication (Groups 1 and 2 in the Postman documentation) must use this Cookie header.

# Challenges Faced & Solutions

1. Persistent YAML Documentation Errors (Swagger)
Challenge: The swagger-jsdoc parser continually failed with syntax errors due to complex JSDoc comments.

Solution: The documentation approach was completed via Postman Documenter, which proved more robust and less prone to parsing errors, thus satisfying the documentation requirement.

2. Google Auth in Production (Cross-Origin Cookies)
Challenge: After deployment, the browser rejected the session cookie sent by the Render server.

Solution: Implemented a full production cors and express-session configuration in server.js. This involved setting app.set('trust proxy', 1) and configuring the session cookie with sameSite: 'none' and secure: true policies to allow cross-domain authentication over HTTPS.

3. API Key vs. MongoDB ID (Revoke/Regenerate Endpoints)
Challenge: Endpoints crashed with a 500 Internal Server Error because the client was sending the apiKey instead of the required MongoDB _id.

Solution: Verified test and Postman requests were updated to send the correct appId (_id) for database queries.

4. Database Connection Timeout in Testing (Jest)
Challenge: Jest tests failed with timeout errors (MongooseError: Operation... buffering timed out).

Root Cause: The test setup used a local in-memory database (mongodb-memory-server) which conflicted with the application's actual code trying to connect to the cloud Redis cache, causing the test environment to hang.

Solution: Ensured the Jest setup file (tests/setup.js) explicitly loaded the .env file and gracefully disconnected the Redis client using redisClient.quit() in the afterAll hook to prevent resource conflicts and allow the process to exit cleanly.

5. Middleware Ordering and Global Protection
Challenge: Early attempts at protecting all API routes resulted in global Rate Limiting being applied too broadly, or general middleware conflicting with specific authentication requirements.

Solution: Ensured strict middleware ordering in server.js. The general rate limiter was correctly scoped using app.use('/api/', rateLimiter) to apply only to API routes. The per-route authentication middleware (isAuth or apiKeyMiddleware) was then applied immediately after the rate limiter but before the final controller logic in the specific route files, ensuring credentials were checked before database access.