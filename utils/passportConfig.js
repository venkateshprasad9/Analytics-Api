
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel'); // We will create this next

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find if the user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists, log them in
          return done(null, user);
        } else {
          // New user, create them in our database
          const newUser = new User({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
          });
          user = await newUser.save();
          return done(null, user);
        }
      } catch (err) {
        console.error('Error in Google passport strategy:', err);
        return done(err, false);
      }
    }
  )
);

// Serializes the user to store in the session
passport.serializeUser((user, done) => {
  done(null, user.id); // user.id is the MongoDB _id
});

// Deserializes the user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});