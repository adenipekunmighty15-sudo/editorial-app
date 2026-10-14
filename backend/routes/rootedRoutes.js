const express = require('express');
const router = express.Router();
const { getBooks, addBook, getClubs, addClub, getStories, addStory } = require('../controllers/rootedController');

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

module.exports = router;
