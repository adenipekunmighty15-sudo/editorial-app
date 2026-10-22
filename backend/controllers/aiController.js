const llm = require('../services/llm');

const MAX_TEXT = 12000;
const clip = (value, max = MAX_TEXT) => String(value ?? '').slice(0, max);

const fail = (res, label) => (error) => {
  console.error(`${label}:`, error.message);
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
  res.status(status).json({ error: `${label} is unavailable right now. Please try again.` });
};

const ASSIST_PROMPTS = {
  refine: 'Refine the text for a mindful, spiritual editorial. Keep a gentle, honest, contemplative tone and the author\'s meaning. Return only the refined text.',
  summarize: 'Write a concise, poetic summary of the text. Return only the summary.',
  headline: 'Suggest three thoughtful, minimalist headlines for the text. Return them one per line, with no numbering.',
  continue: 'Continue this spiritual reflection in the same voice and depth. Return only the continuation.',
  revise: 'Revise this reflection for clarity and emotional depth while keeping its essence. Return only the revised text.',
};

const assist = async (req, res) => {
  const text = clip(req.body?.text);
  if (!text.trim()) return res.status(400).json({ error: 'Text is required' });
  const system = ASSIST_PROMPTS[req.body?.action] || ASSIST_PROMPTS.refine;
  try {
    const result = await llm.generate({ system, prompt: text, maxTokens: 900 });
    res.json({ result });
  } catch (error) {
    fail(res, 'The writing assistant')(error);
  }
};

const analyzeGenre = async (req, res) => {
  const text = clip(req.body?.text);
  if (!text.trim()) return res.status(400).json({ error: 'Text is required' });
  try {
    const parsed = await llm.generateJSON({
      system: 'You are a literary editor. Split the draft into its sections (blank lines separate them). For each section give a short excerpt, a genre, and a one-sentence rationale. Output {"sections":[{"section":"...","genre":"...","rationale":"..."}]}.',
      prompt: text,
      maxTokens: 1200,
      temperature: 0.3,
    });
    const sections = Array.isArray(parsed) ? parsed : parsed.sections;
    res.json({ sections: Array.isArray(sections) ? sections : [] });
  } catch (error) {
    fail(res, 'Genre analysis')(error);
  }
};

const chat = async (req, res) => {
  const message = clip(req.body?.message, 1500);
  if (!message.trim()) return res.status(400).json({ error: 'Message is required' });
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  const context = clip(
    JSON.stringify({ books: req.body?.books, stories: req.body?.stories, clubs: req.body?.clubs }),
    6000,
  );
  const transcript = history
    .map((item) => `${item.role === 'user' ? 'Reader' : 'Rooted'}: ${clip(item.content, 800)}`)
    .join('\n');
  try {
    const answer = await llm.generate({
      system: `You are Rooted, a warm and concise reading companion for a Christian literature community. Answer using the app data below when relevant; never invent books that are not in it.\nApp data: ${context}`,
      prompt: `${transcript ? `${transcript}\n` : ''}Reader: ${message}\nRooted:`,
      maxTokens: 500,
    });
    res.json({ answer });
  } catch (error) {
    fail(res, 'Chat')(error);
  }
};

const pierce = async (req, res) => {
  const text = clip(req.body?.text, 3000);
  if (!text.trim()) return res.status(400).json({ error: 'Text is required' });
  try {
    const question = await llm.generate({
      system: 'You are a gentle spiritual director. Ask ONE piercing question that invites the reader to apply the passage to their own life. Return only the question.',
      prompt: text,
      maxTokens: 120,
      temperature: 0.7,
    });
    res.json({ question });
  } catch (error) {
    fail(res, 'The companion')(error);
  }
};

const ROLES = ['THE ANCHOR', 'THE SPARK', 'THE BRIDGE', 'THE SEEKER'];

const assignRole = async (req, res) => {
  const reflections = clip(JSON.stringify(req.body?.reflections ?? []), 6000);
  try {
    const parsed = await llm.generateJSON({
      system: 'Read the reader\'s reflections and assign ONE role: THE ANCHOR (stable), THE SPARK (provocative), THE BRIDGE (empathetic) or THE SEEKER (curious). Output {"role":"THE ANCHOR","reason":"one sentence"}.',
      prompt: reflections,
      maxTokens: 150,
      temperature: 0.3,
    });
    const role = ROLES.includes(parsed.role) ? parsed.role : 'THE SEEKER';
    res.json({ role: `${role}: ${parsed.reason || ''}`.trim(), name: role, reason: parsed.reason || '' });
  } catch (error) {
    fail(res, 'Role assignment')(error);
  }
};

const recommend = async (req, res) => {
  const preferences = clip(req.body?.preferences, 1000);
  const books = Array.isArray(req.body?.books) ? req.body.books.slice(0, 60) : [];
  if (!books.length) return res.json({ recommendations: [] });
  try {
    const parsed = await llm.generateJSON({
      system: 'You recommend books ONLY from the provided list. Pick up to 4 that best fit the reader. Output {"recommendations":[{"title":"exact title from list","author":"...","reason":"one warm sentence"}]}.',
      prompt: `Reader preferences: ${preferences}\nBooks: ${JSON.stringify(books.map(({ title, author, genre, description }) => ({ title, author, genre, description })))}`,
      maxTokens: 700,
    });
    const titles = new Set(books.map((book) => book.title));
    const list = (Array.isArray(parsed) ? parsed : parsed.recommendations) || [];
    res.json({ recommendations: list.filter((item) => item && titles.has(item.title)) });
  } catch (error) {
    fail(res, 'Recommendations')(error);
  }
};

const clubGuide = async (req, res) => {
  const club = clip(req.body?.club, 200);
  const book = clip(req.body?.book, 200);
  if (!club || !book) return res.status(400).json({ error: 'Club and book are required' });
  try {
    const parsed = await llm.generateJSON({
      system: 'Create a book-club discussion guide. Output {"opening":"a short warm welcome","questions":["five thoughtful, piercing questions"]}.',
      prompt: `Club: ${club}\nBook: ${book}`,
      maxTokens: 700,
    });
    const questions = Array.isArray(parsed.questions) ? parsed.questions.map(String).slice(0, 8) : [];
    res.json({ opening: parsed.opening || '', questions });
  } catch (error) {
    fail(res, 'The discussion guide')(error);
  }
};

module.exports = { assist, write: assist, analyzeGenre, chat, pierce, assignRole, recommend, clubGuide };
