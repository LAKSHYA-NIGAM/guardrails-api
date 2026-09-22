import Bot from '../models/Bot.js';
import { NotFoundException, ValidationException } from '../middleware/errorHandler.js';

export async function createBot(req, res, next) {
  try {
    const { name, personaDescription } = req.body;
    if (!name) {
      throw new ValidationException('name is required');
    }

    const bot = new Bot({
      name,
      personaDescription: personaDescription || ''
    });

    await bot.save();
    return res.status(201).json(bot);
  } catch (err) {
    next(err);
  }
}

export async function getAllBots(req, res, next) {
  try {
    const bots = await Bot.find().sort({ id: 1 });
    return res.status(200).json(bots);
  } catch (err) {
    next(err);
  }
}

export async function getBot(req, res, next) {
  try {
    const id = Number(req.params.id);
    const bot = await Bot.findOne({ id });
    if (!bot) {
      throw new NotFoundException(`Bot not found with id: ${req.params.id}`);
    }
    return res.status(200).json(bot);
  } catch (err) {
    next(err);
  }
}
