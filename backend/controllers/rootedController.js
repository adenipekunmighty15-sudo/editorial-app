const Book = require('../models/Book');
const Club = require('../models/Club');
const Story = require('../models/Story');

exports.getBooks = async (req, res) => {
  const books = await Book.find();
  res.json(books);
};

exports.addBook = async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json(book);
};

exports.getClubs = async (req, res) => {
  const clubs = await Club.find();
  res.json(clubs);
};

exports.addClub = async (req, res) => {
  const club = await Club.create(req.body);
  res.status(201).json(club);
};

exports.getStories = async (req, res) => {
  const stories = await Story.find();
  res.json(stories);
};

exports.addStory = async (req, res) => {
  const story = await Story.create(req.body);
  res.status(201).json(story);
};