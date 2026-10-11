const express = require('express');
const router = express.Router();
const { getBooks, addBook, getClubs, addClub, getStories, addStory } = require('../controllers/rootedController');

router.get('/books', getBooks);
router.post('/books', addBook);
router.get('/clubs', getClubs);
router.post('/clubs', addClub);
router.get('/stories', getStories);
router.post('/stories', addStory);

module.exports = router;