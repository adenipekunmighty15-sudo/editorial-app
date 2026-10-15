const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
const OLLAMA_TIMEOUT_MS = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10);

async function generate({ system, prompt, format, numPredict = 500, temperature = 0.5 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        ...(format ? { format } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        options: { temperature, num_predict: numPredict },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}.`);
    }

    const result = await response.json();
    const content = result.message?.content?.trim();
    if (!content) throw new Error('Ollama returned an empty response.');
    return content;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The local model took too long to respond. Try a smaller model or retry.');
      timeoutError.status = 504;
      throw timeoutError;
    }
    if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED') {
      const unavailableError = new Error('Ollama is not reachable. Start Ollama and retry.');
      unavailableError.status = 503;
      throw unavailableError;
    }
    if (!error.status) error.status = 502;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJSON(content) {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('The model returned an invalid structured response.');
    return JSON.parse(content.slice(start, end + 1));
  }
}

module.exports = { generate, parseJSON };