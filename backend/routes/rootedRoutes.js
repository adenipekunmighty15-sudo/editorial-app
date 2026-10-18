const express = require('express');
const router = express.Router();
const { getBooks, addBook, getClubs, addClub, getStories, addStory } = require('../controllers/rootedController');
const aiController = require('../controllers/aiController');
const analyticsController = require('../controllers/analyticsController');

// Write endpoints are disabled by default for the public launch (read-only v1).
// Set ENABLE_WRITES=true to re-enable content creation.
const writeGuard = (req, res, next) => {
  if (process.env.ENABLE_WRITES === 'true') return next();
  res.status(403).json({ error: 'Content creation is currently disabled.' });
};

router.get('/books', getBooks);
router.post('/books', writeGuard, addBook);
router.get('/clubs', getClubs);
router.post('/clubs', writeGuard, addClub);
router.get('/stories', getStories);
router.post('/stories', writeGuard, addStory);
router.post('/ai/assist', aiController.assist);
router.post('/ai/write', aiController.write);
router.post('/analytics/log', analyticsController.logView);
router.get('/analytics/stats', analyticsController.getStats);
router.post('/ai/genre', aiController.analyzeGenre);
router.post('/ai/recommendations', aiController.recommend);
router.post('/ai/club-guide', aiController.clubGuide);
router.post('/ai/chat', aiController.chat);
router.post('/ai/pierce', aiController.pierce);
router.post('/soul-markers', rootedController.saveSoulMarker);
router.get('/soul-markers', rootedController.getSoulMarkers);
router.post('/sign-covenant', rootedController.signCovenant);

module.exports = router;

module.exports = router;
