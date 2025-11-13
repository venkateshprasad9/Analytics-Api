
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appSchema = new Schema(
  {
    // The user who owns this app
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The name of the website or application
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // The main URL of the website
    url: {
      type: String,
      required: true,
      trim: true,
    },
    // The API key for this app
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    // The status of the key (active, revoked)
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
    },
    // Optional: Expiration date for the key
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Create an index on 'owner' to speed up queries for finding all apps by a user
appSchema.index({ owner: 1 });

// Create an index on 'apiKey' for fast authentication lookups
appSchema.index({ apiKey: 1 });

const App = mongoose.model('App', appSchema);

module.exports = App;