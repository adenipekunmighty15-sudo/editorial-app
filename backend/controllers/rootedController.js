const supabase = require('../config/supabase');

const handle = (res, fn) =>
  fn().catch((error) => {
    console.error('Controller Error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  });

exports.getBooks = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('books').select('*');
    if (error) throw error;
    res.json(data);
  });

exports.addBook = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('books').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.getClubs = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('clubs').select('*');
    if (error) throw error;
    res.json(data);
  });

exports.addClub = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('clubs').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.getStories = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('stories').select('*');
    if (error) throw error;
    res.json(data);
  });

exports.addStory = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('stories').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });
