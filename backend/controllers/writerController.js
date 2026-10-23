const supabase = require('../config/supabase');
const { httpError, textField, handle, countWords, readTimeFor } = require('../utils/validate');

const getProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
};

const requireWriter = async (req) => {
  const profile = await getProfile(req.user.id);
  if (!profile?.is_writer) throw httpError('Join the writers first to publish stories.', 403);
  return profile;
};

// Public directory of writers with their published story counts.
exports.listWriters = (req, res) =>
  handle(res, async () => {
    const { data: writers, error } = await supabase
      .from('profiles').select('user_id, display_name, bio, created_at').eq('is_writer', true).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const { data: stories, error: storyError } = await supabase
      .from('stories').select('user_id, likes').eq('status', 'published').in('user_id', writers.map((w) => w.user_id).concat('00000000-0000-0000-0000-000000000000'));
    if (storyError) throw storyError;
    res.json({
      writers: writers.map((writer) => {
        const mine = stories.filter((story) => story.user_id === writer.user_id);
        return { name: writer.display_name, bio: writer.bio, stories: mine.length, likes: mine.reduce((sum, s) => sum + (s.likes || 0), 0) };
      }),
    });
  });

exports.getWriterProfile = (req, res) =>
  handle(res, async () => {
    const profile = await getProfile(req.user.id);
    res.json({ isWriter: Boolean(profile?.is_writer), profile: profile ? { name: profile.display_name, bio: profile.bio } : null });
  });

exports.saveWriterProfile = (req, res) =>
  handle(res, async () => {
    const display_name = textField(req.body?.name, 'Writer name', 60);
    const bio = textField(req.body?.bio || '', 'Bio', 400, false);
    const { data, error } = await supabase
      .from('profiles').upsert({ user_id: req.user.id, display_name, bio, is_writer: true }, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    res.status(201).json({ isWriter: true, profile: { name: data.display_name, bio: data.bio } });
  });

exports.getMyStories = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('stories').select('*').eq('user_id', req.user.id).order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ stories: data });
  });

const storyFields = (body, existing = {}) => {
  const status = body.status === 'draft' ? 'draft' : 'published';
  const content = textField(body.content ?? existing.content ?? '', 'Story', 50000, status === 'published');
  const title = textField(body.title || existing.title || (status === 'draft' ? 'Untitled draft' : ''), 'Title', 180);
  return {
    title,
    content,
    excerpt: textField(body.excerpt || content.slice(0, 140), 'Excerpt', 500, false),
    read_time: readTimeFor(content),
    status,
  };
};

exports.createStory = (req, res) =>
  handle(res, async () => {
    const profile = await requireWriter(req);
    const fields = storyFields(req.body || {});
    const row = {
      ...fields,
      user_id: req.user.id,
      author: profile.display_name,
      published_at: fields.status === 'published' ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase.from('stories').insert(row).select().single();
    if (error) throw error;
    res.status(201).json(data);
  });

const ownStory = async (req) => {
  const { data, error } = await supabase.from('stories').select('*').eq('id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!data) throw httpError('Story not found.', 404);
  if (data.user_id !== req.user.id) throw httpError('You can only change your own stories.', 403);
  return data;
};

exports.updateStory = (req, res) =>
  handle(res, async () => {
    const story = await ownStory(req);
    const fields = storyFields(req.body || {}, story);
    const patch = { ...fields };
    if (fields.status === 'published' && !story.published_at) patch.published_at = new Date().toISOString();
    const { data, error } = await supabase.from('stories').update(patch).eq('id', story.id).select().single();
    if (error) throw error;
    res.json(data);
  });

exports.deleteStory = (req, res) =>
  handle(res, async () => {
    const story = await ownStory(req);
    const { error } = await supabase.from('stories').delete().eq('id', story.id);
    if (error) throw error;
    res.status(204).end();
  });

exports.getWriterStats = (req, res) =>
  handle(res, async () => {
    const { data, error } = await supabase.from('stories').select('status, likes, content').eq('user_id', req.user.id);
    if (error) throw error;
    const published = data.filter((story) => story.status === 'published');
    res.json({
      published: published.length,
      drafts: data.length - published.length,
      likes: published.reduce((sum, story) => sum + (story.likes || 0), 0),
      words: data.reduce((sum, story) => sum + countWords(story.content), 0),
    });
  });
