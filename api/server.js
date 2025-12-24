// Vercel Serverless Function Entry Point
// This file acts as the bridge between Vercel (ESM) and our Backend (CommonJS)

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the Express App (which uses CommonJS internally)
const app = require('../backend/index.js');

// Export it as a Vercel Serverless Function
export default app;
