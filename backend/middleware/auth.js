const { createClient } = require('@supabase/supabase-js');

let client;
const getClient = () => {
  if (!client) client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return client;
};

// Verifies the Supabase access token sent as "Authorization: Bearer <token>".
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Please sign in to use this feature.' });

  try {
    const { data, error } = await getClient().auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    req.user = data.user;
    return next();
  } catch (err) {
    console.error('Auth check failed:', err.message);
    return res.status(503).json({ error: 'Sign-in could not be verified right now.' });
  }
};

module.exports = { authenticate };

// Like authenticate, but anonymous visitors are allowed through (req.user stays unset).
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return next();
  try {
    const { data } = await getClient().auth.getUser(token);
    if (data?.user) req.user = data.user;
  } catch (err) {
    console.error('Optional auth failed:', err.message);
  }
  return next();
};

module.exports.optionalAuth = optionalAuth;
