/**
 * IP CIDR Matcher & Subnet Firewall Guardrail
 * Parses IPv4 CIDR blocks (e.g. 10.0.0.0/8, 192.168.1.0/24) and matches client IPs.
 */

export function ipToLong(ip) {
  if (typeof ip !== 'string') return 0;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function isIpInCidr(ip, cidr) {
  if (!ip || !cidr || typeof cidr !== 'string') return false;

  const [range, bitsStr] = cidr.trim().split('/');
  const bits = bitsStr !== undefined ? parseInt(bitsStr, 10) : 32;

  if (isNaN(bits) || bits < 0 || bits > 32) return false;

  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);

  if (bits === 0) return true;

  const mask = bits === 32 ? 0xffffffff : ~((1 << (32 - bits)) - 1) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

export class IpFirewall {
  constructor({ blacklist = [], whitelist = [] } = {}) {
    this.blacklist = [...blacklist];
    this.whitelist = [...whitelist];
  }

  isAllowed(ip) {
    if (!ip) return false;

    // 1. Whitelist has precedence
    if (this.whitelist.length > 0) {
      const inWhitelist = this.whitelist.some((rule) => isIpInCidr(ip, rule));
      if (inWhitelist) return true;
    }

    // 2. Blacklist check
    const inBlacklist = this.blacklist.some((rule) => isIpInCidr(ip, rule));
    return !inBlacklist;
  }
}
