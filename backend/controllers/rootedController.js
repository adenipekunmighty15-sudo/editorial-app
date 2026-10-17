const Book = require('../models/Book');
const Club = require('../models/Club');
const Story = require('../models/Story');

const handle = (res, fn) =>
  fn().catch((error) => {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map((e) => e.message),
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid value supplied' });
    }
    return res.status(500).json({ error: 'Server error' });
  });

exports.getBooks = (req, res) =>
  handle(res, async () => {
    const books = await Book.find();
    res.json(books);
  });

exports.addBook = (req, res) =>
  handle(res, async () => {
    const book = await Book.create(req.body);
    res.status(201).json(book);
  });

exports.getClubs = (req, res) =>
  handle(res, async () => {
    const clubs = await Club.find();
    res.json(clubs);
  });

exports.addClub = (req, res) =>
  handle(res, async () => {
    const club = await Club.create(req.body);
    res.status(201).json(club);
  });

exports.getStories = (req, res) =>
  handle(res, async () => {
    const stories = await Story.find();
    res.json(stories);
  });

exports.addStory = (req, res) =>
  handle(res, async () => {
    const story = await Story.create(req.body);
    res.status(201).json(story);
  });
