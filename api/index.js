import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

let isDbInitialized = false;

export default async function handler(req, res) {
  if (!isDbInitialized) {
    try {
      await connectDB();
      isDbInitialized = true;
    } catch (err) {
      console.error('[Vercel Serverless] MongoDB Connection Error:', err.message);
    }
  }
  return app(req, res);
}
