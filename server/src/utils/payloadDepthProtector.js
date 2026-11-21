/**
 * Payload Depth & Nested Object Explosion Protector
 * Recursively inspects incoming payloads to prevent JSON depth exhaustion attacks (e.g. 1000-deep objects).
 */

export function calculateObjectDepth(obj, currentDepth = 1, maxDepth = 15) {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }

  if (currentDepth > maxDepth) {
    return currentDepth;
  }

  let deepest = currentDepth;
  const values = Array.isArray(obj) ? obj : Object.values(obj);

  for (const val of values) {
    if (val !== null && typeof val === 'object') {
      const childDepth = calculateObjectDepth(val, currentDepth + 1, maxDepth);
      if (childDepth > deepest) {
        deepest = childDepth;
      }
      if (deepest > maxDepth) break;
    }
  }

  return deepest;
}

export function validatePayloadSafety(payload, { maxDepth = 10, maxKeys = 200 } = {}) {
  if (payload === null || typeof payload !== 'object') {
    return { isSafe: true, depth: 1, keyCount: 0 };
  }

  const depth = calculateObjectDepth(payload, 1, maxDepth);
  if (depth > maxDepth) {
    return {
      isSafe: false,
      depth,
      keyCount: 0,
      reason: `Payload exceeds maximum allowed nesting depth of ${maxDepth} (detected ${depth})`,
    };
  }

  // Count total keys recursively
  let count = 0;
  const stack = [payload];
  while (stack.length > 0) {
    const curr = stack.pop();
    if (curr && typeof curr === 'object') {
      const entries = Object.entries(curr);
      count += entries.length;
      if (count > maxKeys) {
        return {
          isSafe: false,
          depth,
          keyCount: count,
          reason: `Payload exceeds maximum key count of ${maxKeys}`,
        };
      }
      for (const [, val] of entries) {
        if (val && typeof val === 'object') stack.push(val);
      }
    }
  }

  return { isSafe: true, depth, keyCount: count };
}
