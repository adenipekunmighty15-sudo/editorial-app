// One entry point for every AI feature.
// Uses the Anthropic API when ANTHROPIC_API_KEY is set (works on Render/hosting),
// otherwise falls back to a local Ollama model for development.
const ollama = require('./ollama');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const TIMEOUT_MS = Number.parseInt(process.env.AI_TIMEOUT_MS || '60000', 10);

function provider() {
  return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'ollama';
}

async function generate({ system, prompt, maxTokens = 600, temperature = 0.5 }) {
  if (provider() === 'ollama') {
    return ollama.generate({ system, prompt, numPredict: maxTokens, temperature });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error?.message || `AI request failed (${response.status}).`);
      error.status = response.status === 429 ? 429 : 502;
      throw error;
    }
    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
    if (!text) throw new Error('The model returned an empty response.');
    return text;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeout = new Error('The AI took too long to respond. Please retry.');
      timeout.status = 504;
      throw timeout;
    }
    if (!error.status) error.status = 502;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Pulls the first JSON object or array out of a model reply.
function extractJSON(content) {
  const text = String(content).trim();
  try {
    return JSON.parse(text);
  } catch {
    const candidates = [['{', '}'], ['[', ']']]
      .map(([open, close]) => [text.indexOf(open), text.lastIndexOf(close)])
      .filter(([start, end]) => start >= 0 && end > start)
      .sort((a, b) => a[0] - b[0]);
    for (const [start, end] of candidates) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // try the next candidate
      }
    }
    throw new Error('The model returned an invalid structured response.');
  }
}

async function generateJSON(options) {
  const reply = await module.exports.generate({
    ...options,
    system: `${options.system}\nReply with valid JSON only: no markdown, no commentary.`,
  });
  return extractJSON(reply);
}

module.exports = { generate, generateJSON, provider };
