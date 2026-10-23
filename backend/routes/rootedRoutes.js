const express = require('express');
const router = express.Router();
const { getBooks, addBook, getClubs, addClub, getStories, addStory, saveSoulMarker, getSoulMarkers, signCovenant } = require('../controllers/rootedController');
const aiController = require('../controllers/aiController');
const analyticsController = require('../controllers/analyticsController');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');

// AI calls cost money: require sign-in and keep a tight per-user limit.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'You are going a little fast. Please wait a minute and try again.' },
});

// Write endpoints are disabled by default for the public launch (read-only v1).
// Set ENABLE_WRITES=true to re-enable content creation.
const writeGuard = (req, res, next) => {
  if (process.env.ENABLE_WRITES === 'true') return next();
  res.status(403).json({ error: 'Content creation is currently disabled.' });
};

router.get('/books', getBooks);
router.post('/books', writeGuard, authenticate, addBook);
router.get('/clubs', getClubs);
router.post('/clubs', writeGuard, authenticate, addClub);
router.get('/stories', getStories);
router.post('/stories', writeGuard, authenticate, addStory);
router.use('/ai', authenticate, aiLimiter);
router.post('/ai/assist', aiController.assist);
router.post('/ai/write', aiController.write);
router.post('/analytics/log', analyticsController.logView);
router.get('/analytics/stats', analyticsController.getStats);
router.post('/ai/genre', aiController.analyzeGenre);
router.post('/ai/recommendations', aiController.recommend);
router.post('/ai/club-guide', aiController.clubGuide);
router.post('/ai/chat', aiController.chat);
router.post('/ai/pierce', aiController.pierce);
router.post('/soul-markers', authenticate, saveSoulMarker);
router.get('/soul-markers', authenticate, getSoulMarkers);
router.post('/sign-covenant', authenticate, signCovenant);

module.exports = router;
