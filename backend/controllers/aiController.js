const axios = require('axios');

const assist = async (req, res) => {
  const { text, action } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const prompts = {
    refine: 'Please refine the following text for a mindful, spiritual editorial. Maintain a gentle, honest, and contemplative tone: ',
    summarize: 'Please provide a concise, poetic summary of the following text: ',
    headline: 'Please suggest three thoughtful, minimalist headlines for the following text: ',
    continue: 'Continue this spiritual reflection in the same tone and depth: ',
    revise: 'Revise this spiritual reflection for greater clarity and emotional depth, while keeping the original essence: ',
  };

  const systemPrompt = prompts[action] || prompts.refine;

  try {
    const response = await axios.post(
      process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: `${systemPrompt}\n\n"${text}"`,
        stream: false,
      },
      { timeout: 10000 }
    );

    res.json({ result: response.data.response });
  } catch (error) {
    console.error('AI Error:', error.message);
    res.status(500).json({ error: 'AI assistant is currently unavailable' });
  }
};

const chat = async (req, res) => {
  const { message, history, books, stories, clubs } = req.body;
  const context = `Books: ${JSON.stringify(books)}\nStories: ${JSON.stringify(stories)}\nClubs: ${JSON.stringify(clubs)}`;
  try {
    const response = await axios.post(
      process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: `You are Rooted, a warm and concise reading companion. Use this context: ${context}\n\nConversation: ${JSON.stringify(history)}\n\nUser: ${message}`,
        stream: false,
      }
    );
    res.json({ answer: response.data.response });
  } catch (error) {
    res.status(500).json({ error: 'Chat unavailable' });
  }
};

const pierce = async (req, res) => {
  const { text } = req.body;
  try {
    const response = await axios.post(
      process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: `You are a spiritual director. Turn this passage into a moment of personal transformation. Ask one "piercing" question that forces the reader to apply the passage to their own life. Return only the question text.\n\nPassage: "${text}"`,
        stream: false,
      }
    );
    res.json({ question: response.data.response });
  } catch (error) {
    res.status(500).json({ error: 'Piercing unavailable' });
  }
};

const assignRole = async (req, res) => {
  const { reflections } = req.body;
  try {
    const response = await axios.post(
      process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: `Analyze these reflections and assign a role: THE ANCHOR (Stable), THE SPARK (Provocative), THE BRIDGE (Empathetic), or THE SEEKER (Curious). Return only the role and a one-sentence reason.\n\nReflections: ${JSON.stringify(reflections)}`,
        stream: false,
      }
    );
    res.json({ role: response.data.response });
  } catch (error) {
    res.status(500).json({ error: 'Role assignment unavailable' });
  }
};

const recommend = async (req, res) => {
  const { preferences, books } = req.body;
  try {
    const response = await axios.post(
      process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: `Based on these preferences: ${preferences}, recommend the best books from this list: ${JSON.stringify(books)}. Provide a reason for each.`,
        stream: false,
      }
    );
    res.json({ recommendations: JSON.parse(response.data.response || '[]') });
  } catch (error) {
    res.status(500).json({ error: 'Recommendations unavailable' });
  }
};

const clubGuide = async (req, res) => {
  const { club, book } = req.body;
  try {
    const response = await axios.post(
      process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: `Create a discussion guide for the club "${club}" reading "${book}". Include an opening and 5 piercing questions.`,
        stream: false,
      }
    );
    res.json({ guide: JSON.parse(response.data.response || '{}') });
  } catch (error) {
    res.status(500).json({ error: 'Guide unavailable' });
  }
};

module.exports = { assist, chat, pierce, assignRole, recommend, clubGuide };
