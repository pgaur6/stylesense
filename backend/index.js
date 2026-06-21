// /backend/index.js
// Entry point for the StyleSense Express backend.
// Sets up middleware, mounts all route files, and starts the server.

require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import route files
const onboardingRoutes = require('./routes/onboarding');
const wardrobeRoutes = require('./routes/wardrobe');
const featureRoutes = require('./routes/features');
const feedbackRoutes = require('./routes/feedback');

const app = express();

// --- Middleware ---
// Allow requests from the frontend
// Explicitly list every allowed origin — never use '*'
app.use(cors({
  origin: [
    'http://localhost:3000',                  // local development
    'https://stylesense-one.vercel.app'       // production frontend on Vercel
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse incoming JSON request bodies
app.use(express.json());

// --- Health check route ---
// A simple GET you can hit in the browser to confirm the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StyleSense backend is running' });
});

// --- Mount routes ---
// onboarding.js handles everything under /api/onboarding
app.use('/api/onboarding', onboardingRoutes);

// wardrobe.js handles everything under /api/wardrobe
app.use('/api/wardrobe', wardrobeRoutes);

// features.js is mounted at /api so its routes become /api/outfit-pairing etc.
app.use('/api', featureRoutes);

// feedback.js handles everything under /api/feedback
app.use('/api/feedback', feedbackRoutes);

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`StyleSense backend running on port ${PORT}`);
});