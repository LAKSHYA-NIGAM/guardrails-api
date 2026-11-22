/**
 * Strict Origin CORS Validator Guardrail
 * Validates Origin request headers against whitelists, wildcard domain patterns,
 * and strictly prevents null origin or regex bypasses.
 */

export function isOriginAllowed(origin, allowedOrigins = []) {
  if (!origin || typeof origin !== 'string') return false;
  const cleanOrigin = origin.trim();

  // Explicitly block 'null' origin attacks
  if (cleanOrigin.toLowerCase() === 'null') return false;

  for (const allowed of allowedOrigins) {
    if (typeof allowed !== 'string') continue;

    // Exact string match
    if (cleanOrigin === allowed.trim()) {
      return true;
    }

    // Wildcard subdomain matching (e.g. *.example.com)
    if (allowed.startsWith('*.')) {
      const rootDomain = allowed.slice(2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Matches https://sub.example.com or http://sub.example.com
      const regex = new RegExp(`^https?:\\/\\/([a-zA-Z0-9-]+\\.)+${rootDomain}(:\\d+)?$`);
      if (regex.test(cleanOrigin)) {
        return true;
      }
    }
  }

  return false;
}
