const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

// Trims a text field and enforces required / max length.
function textField(value, label, max, required = true) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    if (required) throw httpError(`${label} is required.`);
    return '';
  }
  if (text.length > max) throw httpError(`${label} must be ${max} characters or fewer.`);
  return text;
}

const handle = (res, fn) =>
  fn().catch((error) => {
    console.error('Controller Error:', error.message || error);
    const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
  });

const countWords = (text) => (String(text || '').trim().match(/\S+/g) || []).length;
const readTimeFor = (text) => Math.max(1, Math.round(countWords(text) / 200));

module.exports = { httpError, textField, handle, countWords, readTimeFor };
