import assert from 'node:assert';
import test from 'node:test';
import { isIpInCidr, IpFirewall } from '../../src/utils/ipCidrBlocker.js';

test('isIpInCidr: matches IP within CIDR subnet', () => {
  assert.strictEqual(isIpInCidr('192.168.1.50', '192.168.1.0/24'), true);
  assert.strictEqual(isIpInCidr('192.168.2.1', '192.168.1.0/24'), false);

  assert.strictEqual(isIpInCidr('10.5.20.1', '10.0.0.0/8'), true);
  assert.strictEqual(isIpInCidr('11.0.0.1', '10.0.0.0/8'), false);
});

test('IpFirewall: blocks blacklisted subnets while allowing clean IPs', () => {
  const firewall = new IpFirewall({
    blacklist: ['198.51.100.0/24', '203.0.113.5'],
  });

  assert.strictEqual(firewall.isAllowed('198.51.100.45'), false);
  assert.strictEqual(firewall.isAllowed('203.0.113.5'), false);
  assert.strictEqual(firewall.isAllowed('8.8.8.8'), true);
});

test('IpFirewall: whitelist allows explicit IPs', () => {
  const firewall = new IpFirewall({
    whitelist: ['127.0.0.1/32', '10.0.0.0/16'],
    blacklist: ['10.0.5.0/24'], // Whitelist takes precedence
  });

  assert.strictEqual(firewall.isAllowed('10.0.5.10'), true);
  assert.strictEqual(firewall.isAllowed('127.0.0.1'), true);
});
