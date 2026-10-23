const supabase = require('../config/supabase');

const logView = async (req, res) => {
  const { storyId, userId } = req.body;

  if (!storyId) {
    return res.status(400).json({ error: 'storyId is required' });
  }

  try {
    const { error } = await supabase
      .from('page_views')
      .insert([{ story_id: storyId, user_id: userId, viewed_at: new Date() }]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Analytics Error:', error.message);
    res.status(500).json({ error: 'Could not log view' });
  }
};

const getStats = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('page_views')
      .select('story_id')
      .order('viewed_at', { ascending: false })
      .limit(5000);

    if (error) throw error;
    const counts = {};
    data.forEach((row) => {
      counts[row.story_id] = (counts[row.story_id] || 0) + 1;
    });
    res.json({ stats: Object.entries(counts).map(([story_id, count]) => ({ story_id, count })) });
  } catch (error) {
    console.error('Analytics Error:', error.message);
    res.status(500).json({ error: 'Could not fetch stats' });
  }
};

module.exports = { logView, getStats };
