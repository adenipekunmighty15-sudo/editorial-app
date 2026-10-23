const supabase = require('../config/supabase');
const { httpError, textField, handle } = require('../utils/validate');

const byTitle = async (table, title) => {
  const clean = textField(decodeURIComponent(String(title || '')), 'Title', 200);
  const { data, error } = await supabase.from(table).select('id, title').eq('title', clean).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw httpError('Not found.', 404);
  return data;
};

// Everything the signed-in reader has saved, so the app can restore it after a reload.
exports.getMyLibrary = (req, res) =>
  handle(res, async () => {
    const userId = req.user.id;
    const [shelf, joined, liked, subs] = await Promise.all([
      supabase.from('user_books').select('progress, saved, books(title)').eq('user_id', userId),
      supabase.from('club_members').select('clubs(title)').eq('user_id', userId),
      supabase.from('story_likes').select('stories(title)').eq('user_id', userId),
      supabase.from('subscriptions').select('author').eq('user_id', userId),
    ]);
    for (const result of [shelf, joined, liked, subs]) if (result.error) throw result.error;
    res.json({
      books: shelf.data.filter((row) => row.books).map((row) => ({ title: row.books.title, progress: row.progress, saved: row.saved })),
      joinedClubs: joined.data.filter((row) => row.clubs).map((row) => row.clubs.title),
      likedStories: liked.data.filter((row) => row.stories).map((row) => row.stories.title),
      subscriptions: subs.data.map((row) => row.author),
    });
  });

const upsertShelf = async (userId, bookId, patch) => {
  const { data: current, error: readError } = await supabase
    .from('user_books').select('progress, saved').eq('user_id', userId).eq('book_id', bookId).maybeSingle();
  if (readError) throw readError;
  const row = { user_id: userId, book_id: bookId, progress: 0, saved: false, ...current, ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('user_books').upsert(row, { onConflict: 'user_id,book_id' }).select('progress, saved').single();
  if (error) throw error;
  return data;
};

exports.setProgress = (req, res) =>
  handle(res, async () => {
    const progress = Number(req.body?.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw httpError('Progress must be between 0 and 100.');
    const book = await byTitle('books', req.params.title);
    res.json(await upsertShelf(req.user.id, book.id, { progress: Math.round(progress) }));
  });

exports.toggleSave = (req, res) =>
  handle(res, async () => {
    const book = await byTitle('books', req.params.title);
    const { data } = await supabase.from('user_books').select('saved').eq('user_id', req.user.id).eq('book_id', book.id).maybeSingle();
    res.json(await upsertShelf(req.user.id, book.id, { saved: !data?.saved }));
  });

exports.joinClub = (req, res) =>
  handle(res, async () => {
    const club = await byTitle('clubs', req.params.title);
    const { error } = await supabase.from('club_members').upsert({ club_id: club.id, user_id: req.user.id }, { onConflict: 'club_id,user_id' });
    if (error) throw error;
    res.status(201).json({ joined: true });
  });

exports.likeStory = (req, res) =>
  handle(res, async () => {
    const story = await byTitle('stories', req.params.title);
    const { data: existing } = await supabase.from('story_likes').select('story_id').eq('story_id', story.id).eq('user_id', req.user.id).maybeSingle();
    const { error } = existing
      ? await supabase.from('story_likes').delete().eq('story_id', story.id).eq('user_id', req.user.id)
      : await supabase.from('story_likes').insert({ story_id: story.id, user_id: req.user.id });
    if (error) throw error;
    const { count } = await supabase.from('story_likes').select('*', { count: 'exact', head: true }).eq('story_id', story.id);
    await supabase.from('stories').update({ likes: count ?? 0 }).eq('id', story.id);
    res.json({ liked: !existing, likes: count ?? 0 });
  });

exports.postNote = (req, res) =>
  handle(res, async () => {
    const content = textField(req.body?.content, 'Note', 1000);
    const author = textField(req.user.user_metadata?.name || req.user.email?.split('@')[0] || 'Reader', 'Author', 140);
    const { data, error } = await supabase.from('notes').insert({ user_id: req.user.id, author, content }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.subscribe = (req, res) =>
  handle(res, async () => {
    const author = textField(req.body?.author, 'Author', 140);
    const { error } = await supabase.from('subscriptions').upsert({ user_id: req.user.id, author }, { onConflict: 'user_id,author' });
    if (error) throw error;
    res.status(201).json({ subscribed: true, author });
  });

exports.getSubscriptions = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('subscriptions').select('author').eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ subscriptions: data.map((row) => row.author) });
  });
