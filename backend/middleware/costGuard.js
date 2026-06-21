// costGuard.js
// Tracks daily OpenAI spend and blocks requests when the $2.00 daily
// limit is reached. Resets automatically at midnight.
// Two exports:
//   costGuard   — Express middleware applied to routes that call the AI
//   addToSpend  — called from logger.js after each AI call

const DAILY_LIMIT_USD = 2.00;

// Running total for today's spend
let dailySpend = 0;

// The calendar date when dailySpend was last reset
let resetDate = new Date().toDateString();

// Resets the spend counter if the date has changed since the last check
function checkAndReset() {
  const today = new Date().toDateString();
  if (today !== resetDate) {
    dailySpend = 0;
    resetDate = today;
  }
}

// Adds the cost of one AI call to the running daily total.
// Called from logger.js — not called directly from routes.
function addToSpend(costUsd) {
  checkAndReset();
  dailySpend += costUsd;
}

// Express middleware — place this on any route that triggers an AI call.
// If the daily limit is exceeded, returns 503 and stops the request.
function costGuard(req, res, next) {
  checkAndReset();
  if (dailySpend >= DAILY_LIMIT_USD) {
    return res.status(503).json({
      error: 'Daily usage limit reached. Service available again tomorrow.',
    });
  }
  next();
}

module.exports = { costGuard, addToSpend };