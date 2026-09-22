import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import redis from './config/redis.js';
import { startNotificationSweeper, stopNotificationSweeper } from './schedulers/notificationSweeper.js';
import { startViralityDecayScheduler, stopViralityDecayScheduler } from './schedulers/viralityDecayScheduler.js';
import syncService from './services/syncService.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '8080', 10);
let server;

async function bootstrap() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Cold-start Redis counter sync from persistent storage
    await syncService.rebuildCountersFromDb();

    // 3. Start Express server
    server = app.listen(PORT, () => {
      console.log(`[Server] Guardrails Anti-Abuse Engine listening on http://localhost:${PORT}`);
    });

    // 4. Start Schedulers
    const sweepInterval = parseInt(process.env.NOTIFICATION_SWEEP_INTERVAL_MS || '300000', 10);
    const decayInterval = parseInt(process.env.VIRALITY_DECAY_INTERVAL_MS || '300000', 10);
    const decayFactor = parseFloat(process.env.VIRALITY_DECAY_FACTOR || '0.9');

    startNotificationSweeper(sweepInterval);
    startViralityDecayScheduler(decayInterval, decayFactor);
  } catch (error) {
    console.error('Fatal bootstrap error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  stopNotificationSweeper();
  stopViralityDecayScheduler();

  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
    });
  }

  try {
    await redis.quit();
    console.log('Redis connection closed.');
  } catch (e) {
    console.warn('Error closing Redis:', e.message);
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

bootstrap();

export default app;
