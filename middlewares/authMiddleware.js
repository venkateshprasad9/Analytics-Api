// This middleware checks if the user is authenticated (logged in via session)
const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    // req.isAuthenticated() is a method provided by Passport.js
    // If true, the user has a valid session.
    return next();
  }

  // If not authenticated, send an unauthorized error
  res.status(401).json({
    message: 'Unauthorized. Please log in to access this resource.',
  });
};

module.exports = isAuth;