const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const rootedRoutes = require('./routes/rootedRoutes');

dotenv.config();
// connectDB(); // MongoDB connection removed in favor of Supabase

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        connectSrc: [
          "'self'",
          process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : '',
          process.env.OLLAMA_URL ? new URL(process.env.OLLAMA_URL).origin : '',
        ].filter(Boolean),
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: dbStates[mongoose.connection.readyState] || 'unknown',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api', apiLimiter, rootedRoutes);

const clientDir = path.join(__dirname, '..', 'frontend', 'dist');
const hasClient = fs.existsSync(clientDir);

if (hasClient) {
  app.use(express.static(clientDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(clientDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('Rooted API is running'));
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(
    `Server running on port ${PORT}${hasClient ? ' (serving frontend)' : ''}`
  )
);
