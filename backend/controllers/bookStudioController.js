const crypto = require('crypto');
const supabase = require('../config/supabase');
const { httpError, textField, handle } = require('../utils/validate');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COVER_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const idParam = (value) => {
  if (!UUID.test(String(value || ''))) throw httpError('Not found.', 404);
  return value;
};

const imageUrl = (value) => {
  const url = textField(value || '', 'Cover image', 500, false);
  if (url && !/^https:\/\//i.test(url)) throw httpError('Cover image must be an https link or an upload.');
  return url;
};

const bookFields = (body, existing = {}) => ({
  title: textField(body.title ?? existing.title, 'Title', 180),
  author: textField(body.author ?? existing.author, 'Author', 140),
  genre: textField(body.genre ?? existing.genre ?? '', 'Genre', 80, false),
  tag: textField(body.tag ?? existing.tag ?? '', 'Tag', 80, false),
  image: imageUrl(body.image ?? existing.image),
  color: textField(body.color ?? existing.color ?? 'sage', 'Color', 40, false) || 'sage',
});

const ownBook = async (req, id) => {
  const { data, error } = await supabase.from('books').select('*').eq('id', idParam(id)).maybeSingle();
  if (error) throw error;
  if (!data) throw httpError('Book not found.', 404);
  if (data.user_id !== req.user.id) throw httpError('You can only change your own books.', 403);
  return data;
};

const ownChapter = async (req, id) => {
  const { data, error } = await supabase.from('chapters').select('*').eq('id', idParam(id)).maybeSingle();
  if (error) throw error;
  if (!data) throw httpError('Chapter not found.', 404);
  await ownBook(req, data.book_id);
  return data;
};

exports.listMyBooks = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase
      .from('books').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ books: data });
  });

exports.createMyBook = (req, res) =>
  handle(res, async () => {
    const row = { ...bookFields(req.body || {}), user_id: req.user.id, published: false };
    const { data, error } = await supabase.from('books').insert(row).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.updateMyBook = (req, res) =>
  handle(res, async () => {
    const book = await ownBook(req, req.params.id);
    const patch = bookFields(req.body || {}, book);
    if (typeof req.body?.published === 'boolean') {
      if (req.body.published) {
        const { count, error } = await supabase
          .from('chapters').select('id', { count: 'exact', head: true }).eq('book_id', book.id);
        if (error) throw error;
        if (!count) throw httpError('Add at least one chapter before publishing.');
      }
      patch.published = req.body.published;
    }
    const { data, error } = await supabase.from('books').update(patch).eq('id', book.id).select().single();
    if (error) throw error;
    res.json(data);
  });

exports.deleteMyBook = (req, res) =>
  handle(res, async () => {
    const book = await ownBook(req, req.params.id);
    const { error } = await supabase.from('books').delete().eq('id', book.id);
    if (error) throw error;
    res.status(204).end();
  });

// Readers get chapters of published books; owners also get their unpublished ones.
exports.getChapters = (req, res) =>
  handle(res, async () => {
    const id = idParam(req.params.id);
    const { data: book, error } = await supabase
      .from('books').select('id, title, author, published, user_id').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!book) throw httpError('Book not found.', 404);
    if (!book.published && book.user_id !== req.user?.id) {
      throw httpError('This book has not been published yet.', 403);
    }
    const { data: chapters, error: chapterError } = await supabase
      .from('chapters').select('id, position, title, body').eq('book_id', id).order('position', { ascending: true });
    if (chapterError) throw chapterError;
    res.json({ book: { id: book.id, title: book.title, author: book.author, published: book.published }, chapters });
  });

const chapterFields = (body, existing = {}) => ({
  title: textField(body.title ?? existing.title, 'Chapter title', 180),
  body: textField(body.body ?? existing.body, 'Chapter text', 100000),
});

exports.addChapter = (req, res) =>
  handle(res, async () => {
    const book = await ownBook(req, req.params.id);
    const fields = chapterFields(req.body || {});
    const { data: last, error: lastError } = await supabase
      .from('chapters').select('position').eq('book_id', book.id).order('position', { ascending: false }).limit(1).maybeSingle();
    if (lastError) throw lastError;
    const { data, error } = await supabase
      .from('chapters').insert({ ...fields, book_id: book.id, position: (last?.position ?? 0) + 1 }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

exports.updateChapter = (req, res) =>
  handle(res, async () => {
    const chapter = await ownChapter(req, req.params.id);
    const fields = chapterFields(req.body || {}, chapter);
    const { data, error } = await supabase
      .from('chapters').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', chapter.id).select().single();
    if (error) throw error;
    res.json(data);
  });

exports.deleteChapter = (req, res) =>
  handle(res, async () => {
    const chapter = await ownChapter(req, req.params.id);
    const { error } = await supabase.from('chapters').delete().eq('id', chapter.id);
    if (error) throw error;
    res.status(204).end();
  });

// Swaps a chapter with its neighbour (up = earlier in the book).
exports.moveChapter = (req, res) =>
  handle(res, async () => {
    const chapter = await ownChapter(req, req.params.id);
    const up = req.body?.direction === 'up';
    if (!up && req.body?.direction !== 'down') throw httpError('Direction must be up or down.');
    const query = supabase.from('chapters').select('id, position').eq('book_id', chapter.book_id);
    const { data: neighbour, error } = await (up
      ? query.lt('position', chapter.position).order('position', { ascending: false })
      : query.gt('position', chapter.position).order('position', { ascending: true })
    ).limit(1).maybeSingle();
    if (error) throw error;
    if (!neighbour) return res.json({ moved: false });
    const steps = [
      supabase.from('chapters').update({ position: -1 }).eq('id', chapter.id),
      supabase.from('chapters').update({ position: chapter.position }).eq('id', neighbour.id),
      supabase.from('chapters').update({ position: neighbour.position }).eq('id', chapter.id),
    ];
    for (const step of steps) {
      const { error: stepError } = await step;
      if (stepError) throw stepError;
    }
    return res.json({ moved: true });
  });

// Gives the browser a one-time URL to upload a cover straight to Supabase Storage.
exports.signCoverUpload = (req, res) =>
  handle(res, async () => {
    const extension = COVER_TYPES[req.body?.contentType];
    if (!extension) throw httpError('Covers must be JPG, PNG or WebP images.');
    const path = `${req.user.id}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
    const { data, error } = await supabase.storage.from('covers').createSignedUploadUrl(path);
    if (error) throw error;
    const { data: publicData } = supabase.storage.from('covers').getPublicUrl(path);
    res.json({ path: data.path, token: data.token, publicUrl: publicData.publicUrl });
  });
