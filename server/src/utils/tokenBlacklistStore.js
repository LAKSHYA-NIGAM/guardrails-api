/**
 * JWT Token Revocation Blacklist Store
 * Maintains revoked JWT jti (JWT ID) claims with auto-expiring TTLs.
 */

export class TokenBlacklistStore {
  constructor() {
    this.store = new Map(); // tokenHash -> expiresAtMs
  }

  revoke(tokenId, ttlSeconds = 3600) {
    if (!tokenId || typeof tokenId !== 'string') return false;
    const sec = Math.max(0.001, Number(ttlSeconds) || 3600);
    const expiresAt = Date.now() + Math.ceil(sec * 1000);
    this.store.set(tokenId, expiresAt);
    return true;
  }

  isRevoked(tokenId) {
    if (!tokenId || !this.store.has(tokenId)) return false;

    const expiresAt = this.store.get(tokenId);
    if (Date.now() > expiresAt) {
      this.store.delete(tokenId); // Lazily purge expired
      return false;
    }
    return true;
  }

  purgeExpired() {
    const now = Date.now();
    let purged = 0;
    for (const [key, expiresAt] of this.store.entries()) {
      if (now > expiresAt) {
        this.store.delete(key);
        purged++;
      }
    }
    return purged;
  }

  size() {
    return this.store.size;
  }
}
