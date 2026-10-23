const supabase = require('../config/supabase');

const { textField, handle } = require('../utils/validate');

const paginate = (req, defaultLimit = 20, maxLimit = 50) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit || String(defaultLimit), 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const validateBook = (body) => ({
  title: textField(body.title, 'Title', 180),
  author: textField(body.author, 'Author', 140),
  tag: textField(body.tag || '', 'Tag', 80, false),
  genre: textField(body.genre || '', 'Genre', 80, false),
  image: textField(body.image || '', 'Image URL', 500, false),
  color: textField(body.color || 'sage', 'Color', 40, false),
  progress: (() => {
    const p = Number(body.progress);
    if (!Number.isFinite(p) || p < 0 || p > 100) return 0;
    return p;
  })(),
  published: Boolean(body.published),
});

const validateClub = (body) => ({
  title: textField(body.title, 'Title', 180),
  book: textField(body.book, 'Book', 180),
  members: textField(body.members || '0 / 5', 'Members', 20, false),
  time: textField(body.time || 'Anytime', 'Time', 80, false),
  image: textField(body.image || '', 'Image URL', 500, false),
  is_reading_now: Boolean(body.is_reading_now),
});

exports.getBooks = (req, res) =>
  handle(res, async () => {
    const { page, limit, offset } = paginate(req);
    const { data, error, count } = await supabase
      .from('books')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({ books: data, page, limit, total: count ?? 0 });
  });

exports.addBook = (req, res) =>
  handle(res, async () => {
    const book = { ...validateBook(req.body), user_id: req.user.id, published: false };
    const { data, error } = await supabase.from('books').insert([book]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.getClubs = (req, res) =>
  handle(res, async () => {
    const { page, limit, offset } = paginate(req);
    const { data, error, count } = await supabase
      .from('clubs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({ clubs: data, page, limit, total: count ?? 0 });
  });

exports.addClub = (req, res) =>
  handle(res, async () => {
    const club = { ...validateClub(req.body), user_id: req.user.id };
    const { data, error } = await supabase.from('clubs').insert([club]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.getStories = (req, res) =>
  handle(res, async () => {
    const { page, limit, offset } = paginate(req);
    const { data, error, count } = await supabase
      .from('stories')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({ stories: data, page, limit, total: count ?? 0 });
  });

exports.saveSoulMarker = (req, res) =>
  handle(res, async () => {
    const { source_text, ai_question, user_reflection, source_type, source_id } = req.body;
    const user_id = req.user.id;
    if (!source_text || !ai_question || !user_id) {
      throw Object.assign(new Error('Missing required fields: source_text, ai_question, or user_id.'), { status: 400 });
    }
    const { data, error } = await supabase
      .from('soul_markers')
      .insert({
        user_id,
        source_text,
        ai_question,
        user_reflection,
        source_type,
        source_id,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.getSoulMarkers = (req, res) =>
  handle(res, async () => {
    const user_id = req.user.id;
    const { data, error } = await supabase
      .from('soul_markers')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ markers: data });
  });

exports.signCovenant = (req, res) =>
  handle(res, async () => {
    const { club_id } = req.body;
    const user_id = req.user.id;
    if (!user_id || !club_id) {
      throw Object.assign(new Error('user_id and club_id are required to sign the covenant.'), { status: 400 });
    }
    const { data, error } = await supabase
      .from('covenant_signatures')
      .insert({ user_id, club_id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  });
