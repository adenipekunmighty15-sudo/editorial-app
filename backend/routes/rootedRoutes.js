const express = require('express');
const router = express.Router();
const { getBooks, addBook, getClubs, addClub, getStories, saveSoulMarker, getSoulMarkers, signCovenant } = require('../controllers/rootedController');
const aiController = require('../controllers/aiController');
const analyticsController = require('../controllers/analyticsController');
const library = require('../controllers/libraryController');
const writer = require('../controllers/writerController');
const rateLimit = require('express-rate-limit');
const { authenticate, optionalAuth } = require('../middleware/auth');
const studio = require('../controllers/bookStudioController');

// AI calls cost money: require sign-in and keep a tight per-user limit.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'You are going a little fast. Please wait a minute and try again.' },
});

// Content creation is on by default. Set ENABLE_WRITES=false to pause it (read-only mode).
const writeGuard = (req, res, next) => {
  if (process.env.ENABLE_WRITES !== 'false') return next();
  res.status(403).json({ error: 'Content creation is paused right now.' });
};

router.get('/books', getBooks);
router.post('/books', writeGuard, authenticate, addBook);
router.get('/clubs', getClubs);
router.post('/clubs', writeGuard, authenticate, addClub);
router.get('/stories', getStories);

// Reader library: progress, saved books, clubs, likes, notes, subscriptions
router.get('/me/library', authenticate, library.getMyLibrary);
router.patch('/books/:title/progress', authenticate, library.setProgress);
router.post('/books/:title/save', authenticate, library.toggleSave);
router.post('/clubs/:title/join', authenticate, library.joinClub);
router.post('/stories/:title/like', authenticate, library.likeStory);
router.post('/notes', authenticate, library.postNote);
router.post('/subscriptions', authenticate, library.subscribe);
router.get('/subscriptions', authenticate, library.getSubscriptions);

// Writers
router.get('/writers', writer.listWriters);
router.get('/writer/profile', authenticate, writer.getWriterProfile);
router.post('/writer/profile', writeGuard, authenticate, writer.saveWriterProfile);
router.get('/writer/stories', authenticate, writer.getMyStories);
router.post('/writer/stories', writeGuard, authenticate, writer.createStory);
router.patch('/writer/stories/:id', writeGuard, authenticate, writer.updateStory);
router.delete('/writer/stories/:id', writeGuard, authenticate, writer.deleteStory);
router.get('/writer/stats', authenticate, writer.getWriterStats);
// Book studio: authors manage books, chapters and covers; readers read published chapters.
router.get('/books/:id/chapters', optionalAuth, studio.getChapters);
router.get('/my/books', authenticate, studio.listMyBooks);
router.post('/my/books', writeGuard, authenticate, studio.createMyBook);
router.patch('/my/books/:id', writeGuard, authenticate, studio.updateMyBook);
router.delete('/my/books/:id', writeGuard, authenticate, studio.deleteMyBook);
router.post('/my/books/:id/chapters', writeGuard, authenticate, studio.addChapter);
router.patch('/my/chapters/:id', writeGuard, authenticate, studio.updateChapter);
router.delete('/my/chapters/:id', writeGuard, authenticate, studio.deleteChapter);
router.post('/my/chapters/:id/move', writeGuard, authenticate, studio.moveChapter);
router.post('/uploads/cover', writeGuard, authenticate, studio.signCoverUpload);
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
