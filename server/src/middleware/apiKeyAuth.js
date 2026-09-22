import Bot from '../models/Bot.js';

/**
 * Validates X-API-Key header against registered Bot integration accounts.
 *
 * In production, automated agents/bots must authenticate via API keys
 * rather than arbitrary identity assertion.
 */
export async function validateBotApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

  // If authorType is BOT or X-API-Key is provided, validate credentials
  if (req.body?.authorType === 'BOT' || apiKey) {
    if (!apiKey) {
      return res.status(401).json({
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Missing required X-API-Key header for automated bot actions',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const bot = await Bot.findOne({ apiKey });
      if (!bot) {
        return res.status(401).json({
          status: 401,
          error: 'UNAUTHORIZED',
          message: 'Invalid X-API-Key header provided',
          timestamp: new Date().toISOString()
        });
      }

      req.bot = bot;
      // Auto-bind authorId if not explicitly matched
      if (!req.body.authorId) {
        req.body.authorId = bot.id;
      }
    } catch (err) {
      return next(err);
    }
  }

  next();
}

export default validateBotApiKey;
