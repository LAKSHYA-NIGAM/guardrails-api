import viralityService from '../services/viralityService.js';

let decayInterval = null;

/**
 * Scheduled decay job that decays virality scores every 5 minutes.
 * Prevents stale posts from staying viral forever.
 */
export async function decayViralityScores(factor = 0.9) {
  try {
    console.info(`[ViralityDecay] Triggered (decay factor: ${factor})`);
    await viralityService.decayAllScores(factor);
  } catch (err) {
    console.error('[ViralityDecay] Error running decay job:', err.message);
  }
}

export function startViralityDecayScheduler(intervalMs = 300000, factor = 0.9) {
  if (decayInterval) clearInterval(decayInterval);
  decayInterval = setInterval(() => decayViralityScores(factor), intervalMs);
  console.info(`[ViralityDecay] Initialized (interval: ${intervalMs}ms, factor: ${factor})`);
}

export function stopViralityDecayScheduler() {
  if (decayInterval) clearInterval(decayInterval);
}

export default { startViralityDecayScheduler, stopViralityDecayScheduler, decayViralityScores };
