require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const countdownRoutes = require('./routes/countdownRoutes');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and set your connection string.');
  process.exit(1);
}

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/countdowns', countdownRoutes);

// Unknown API routes return JSON instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed.',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB.');
  } catch (error) {
    console.error('Could not connect to MongoDB:', error.message);
    console.error('Check that MongoDB is running (or your Atlas settings) and that MONGODB_URI in .env is correct.');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Countdown Clock running at http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('\nShutting down...');
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected.'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected.'));

start();
