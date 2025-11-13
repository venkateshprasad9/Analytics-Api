const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    // The App/Website this event belongs to (links to appModel)
    app: {
      type: Schema.Types.ObjectId,
      ref: 'App',
      required: true,
    },
    // The type of event (e.g., "click", "visit", "login_form_cta_click")
    event: {
      type: String,
      required: true,
      trim: true,
    },
    // The page URL where the event occurred
    url: {
      type: String,
      trim: true,
    },
    // Referrer information
    referrer: {
      type: String,
      trim: true,
    },
    // "mobile", "desktop", "tablet"
    device: {
      type: String,
      trim: true,
    },
    // IP address of the user
    ipAddress: {
      type: String,
      trim: true,
    },
    // A unique identifier for the user (can be a cookie ID, etc.)
    // We will use this for the /user-stats endpoint
    userId: {
      type: String,
      trim: true,
    },
    // Nested object for all other metadata
    metadata: {
      browser: String,
      os: String,
      screenSize: String,
    },
  },
  {
    // We use timestamps: true to get a 'createdAt' field by default
    // which serves as our 'timestamp' for the event.
    timestamps: true,
  }
);

// --- Indexes for Performance ---
// These are crucial for fast analytics queries.

// Index on 'app' and 'createdAt' for time-based queries per app
eventSchema.index({ app: 1, createdAt: -1 });

// Index on 'app' and 'event' for the event-summary endpoint
eventSchema.index({ app: 1, event: 1 });

// Index on 'userId' for the user-stats endpoint
eventSchema.index({ userId: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;