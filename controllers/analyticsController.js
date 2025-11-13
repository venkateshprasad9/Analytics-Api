

const Event = require('../models/eventModel');
const App = require('../models/appModel');
const mongoose = require('mongoose');
const redisClient = require('../utils/cache'); 

const CACHE_EXPIRATION = 300; 

/**
 * @desc Collects a new analytics event
 * @route POST /api/analytics/collect
 * @access Private (Requires API Key)
 */
exports.collectEvent = async (req, res) => {
  try {
    const appId = req.appId;
    const { event, url, referrer, device, ipAddress, userId, metadata } =
      req.body;

    const newEvent = new Event({
      app: appId,
      event,
      url,
      referrer,
      device,
      ipAddress,
      userId,
      metadata,
    });

    // "Fire and forget"
    newEvent.save().catch((err) => {
      console.error('Error saving event to DB:', err);
    });
    
    // --- Clear related cache ---
    
    const cacheKey = `summary:${event}:${appId}:${req.user?._id || ''}`; 
    redisClient.del(cacheKey); // <-- NOW 'redisClient' IS USED

    res.status(202).json({ message: 'Event accepted.' });
  } catch (error) {
    console.error('Error in collectEvent controller:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * @desc Retrieves analytics summary for events
 * @route GET /api/analytics/event-summary
 * @access Private (User login)
 */
exports.getEventSummary = async (req, res) => {
  try {
    const { event, startDate, endDate, app_id } = req.query;
    const userId = req.user._id; // Get logged in user

    // --- 1. Create a Unique Cache Key ---
    const cacheKey = `summary:${event}:${app_id || 'all'}:${startDate || ''}:${
      endDate || ''
    }:${userId}`;

    // --- 2. Try to Get Data from Redis First ---
   
    const cachedData = await redisClient.get(cacheKey); 
    if (cachedData) {
      console.log('CACHE HIT:', cacheKey);
      return res.status(200).json(JSON.parse(cachedData));
    }
    
    console.log('CACHE MISS:', cacheKey);

    // --- 3. Build the Match Query ---
    const matchQuery = {
      event: event,
    };

    if (app_id) {
      const app = await App.findOne({ _id: app_id, owner: userId });
      if (!app) {
        return res.status(403).json({ message: 'Access to this app is denied.' });
      }
      matchQuery.app = new mongoose.Types.ObjectId(app_id);
    } else {
      const userApps = await App.find({ owner: userId }).select('_id');
      const appIds = userApps.map((app) => app._id);
      matchQuery.app = { $in: appIds };
    }

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.createdAt.$lte = new Date(endDate);
      }
    }

    // --- 4. Run the Aggregation (if cache missed) ---
    const aggregation = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$device',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: '$count' },
          totalUniqueUsers: { $addToSet: '$uniqueUsers' },
          deviceData: {
            $push: {
              k: { $ifNull: ['$_id', 'unknown'] },
              v: '$count',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          event: event,
          count: '$totalCount',
          uniqueUsers: {
            $size: {
              $reduce: {
                input: '$totalUniqueUsers',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] },
              },
            },
          },
          deviceData: { $arrayToObject: '$deviceData' },
        },
      },
    ];

    const result = await Event.aggregate(aggregation);
    const summary = result[0] || {
      event: event,
      count: 0,
      uniqueUsers: 0,
      deviceData: {},
    };

    // --- 5. Save the Result to Redis ---
   
    await redisClient.set( 
      cacheKey,
      JSON.stringify(summary),
      'EX',
      CACHE_EXPIRATION
    );

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error in getEventSummary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc Returns stats for a specific unique user
 * @route GET /api/analytics/user-stats
 * @access Private (User login)
 */
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.query;

    // --- 1. Create a Unique Cache Key ---
    const cacheKey = `userstats:${userId}`;

    // --- 2. Try to Get Data from Redis First ---
   
    const cachedData = await redisClient.get(cacheKey); 
    if (cachedData) {
      console.log('CACHE HIT:', cacheKey);
      return res.status(200).json(JSON.parse(cachedData));
    }
    
    console.log('CACHE MISS:', cacheKey);

    // --- 3. Get Data from DB (if cache missed) ---
    const latestEvent = await Event.findOne({ userId: userId })
      .sort({ createdAt: -1 })
      .select('ipAddress metadata.browser metadata.os');

    if (!latestEvent) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const totalEvents = await Event.countDocuments({ userId: userId });

    const response = {
      userId: userId,
      totalEvents: totalEvents,
      deviceDetails: {
        browser: latestEvent.metadata?.browser || 'Unknown',
        os: latestEvent.metadata?.os || 'Unknown',
      },
      ipAddress: latestEvent.ipAddress || 'Unknown',
    };

    // --- 4. Save the Result to Redis ---
    
    await redisClient.set( 
      cacheKey,
      JSON.stringify(response),
      'EX',
      CACHE_EXPIRATION
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getUserStats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};