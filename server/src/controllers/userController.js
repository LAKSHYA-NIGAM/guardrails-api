import User from '../models/User.js';
import { NotFoundException, ValidationException } from '../middleware/errorHandler.js';

export async function createUser(req, res, next) {
  try {
    const { username, isPremium } = req.body;
    if (!username) {
      throw new ValidationException('username is required');
    }

    const existing = await User.findOne({ username });
    if (existing) {
      throw new ValidationException(`Username '${username}' is already taken`);
    }

    const user = new User({
      username,
      isPremium: Boolean(isPremium)
    });

    await user.save();
    return res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function getAllUsers(req, res, next) {
  try {
    const users = await User.find().sort({ id: 1 });
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    const user = await User.findOne({ id });
    if (!user) {
      throw new NotFoundException(`User not found with id: ${req.params.id}`);
    }
    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}
