import { describe, it, expect } from 'vitest';
import { applyPrivacyFilter } from '../../src/types.js';
import type { PrivacyFilterResult } from '../../src/types.js';

describe('applyPrivacyFilter', () => {
  // ── No redactions ──────────────────────────────────────────────

  it('returns input unchanged when no sensitive content is present', () => {
    const input = 'This is a normal learning about architecture patterns.';
    const result = applyPrivacyFilter(input);
    expect(result.filtered).toBe(input);
    expect(result.redactionCount).toBe(0);
    expect(result.redactionTypes).toEqual([]);
  });

  it('handles empty string', () => {
    const result = applyPrivacyFilter('');
    expect(result.filtered).toBe('');
    expect(result.redactionCount).toBe(0);
  });

  // ── API Keys ───────────────────────────────────────────────────

  it('redacts api_key with equals sign', () => {
    const result = applyPrivacyFilter('api_key=ABCDEFGHIJ1234567890');
    expect(result.filtered).toBe('[REDACTED:API_KEY]');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('api-key');
  });

  it('redacts api-key with colon', () => {
    const result = applyPrivacyFilter('api-key: "sk_live_1234567890abcdef"');
    expect(result.filtered).toBe('[REDACTED:API_KEY]');
    expect(result.redactionCount).toBe(1);
  });

  it('redacts apikey without separator', () => {
    const result = applyPrivacyFilter('apikey=my_super_secret_key_value');
    expect(result.filtered).toBe('[REDACTED:API_KEY]');
    expect(result.redactionCount).toBe(1);
  });

  // ── Tokens ─────────────────────────────────────────────────────

  it('redacts bearer token', () => {
    const result = applyPrivacyFilter('bearer=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig');
    expect(result.filtered).toBe('[REDACTED:TOKEN]');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('token');
  });

  it('redacts jwt token', () => {
    const result = applyPrivacyFilter('jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature"');
    expect(result.filtered).toBe('[REDACTED:TOKEN]');
    expect(result.redactionCount).toBe(1);
  });

  it('redacts token with equals', () => {
    const result = applyPrivacyFilter('token=abcdef1234567890abcdefgh');
    expect(result.filtered).toBe('[REDACTED:TOKEN]');
    expect(result.redactionCount).toBe(1);
  });

  // ── Passwords ──────────────────────────────────────────────────

  it('redacts password with equals', () => {
    const result = applyPrivacyFilter('password=hunter2');
    expect(result.filtered).toBe('[REDACTED:PASSWORD]');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('password');
  });

  it('redacts passwd with colon', () => {
    const result = applyPrivacyFilter('passwd: "s3cr3t!"');
    expect(result.filtered).toBe('[REDACTED:PASSWORD]');
    expect(result.redactionCount).toBe(1);
  });

  it('redacts pwd', () => {
    const result = applyPrivacyFilter('pwd=MyP@ss');
    expect(result.filtered).toBe('[REDACTED:PASSWORD]');
    expect(result.redactionCount).toBe(1);
  });

  // ── Connection Strings ─────────────────────────────────────────

  it('redacts MongoDB connection string', () => {
    const result = applyPrivacyFilter('Use mongodb://user:pass@host:27017/db for staging.');
    expect(result.filtered).toBe('Use [REDACTED:CONNECTION_STRING] for staging.');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('connection-string');
  });

  it('redacts PostgreSQL connection string', () => {
    const result = applyPrivacyFilter('postgres://admin:secret@localhost:5432/mydb');
    expect(result.filtered).toBe('[REDACTED:CONNECTION_STRING]');
  });

  it('redacts Redis connection string', () => {
    const result = applyPrivacyFilter('redis://default:password@cache.example.com:6379');
    expect(result.filtered).toBe('[REDACTED:CONNECTION_STRING]');
  });

  it('redacts MySQL connection string', () => {
    const result = applyPrivacyFilter('mysql://root:pass@db.internal:3306/app');
    expect(result.filtered).toBe('[REDACTED:CONNECTION_STRING]');
  });

  // ── AWS Keys ───────────────────────────────────────────────────

  it('redacts AWS access key (AKIA prefix)', () => {
    const result = applyPrivacyFilter('Key: AKIAIOSFODNN7EXAMPLE');
    expect(result.filtered).toBe('Key: [REDACTED:AWS_KEY]');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('aws-key');
  });

  it('redacts AWS key with ASIA prefix', () => {
    const result = applyPrivacyFilter('ASIATEMPORARYKEYXMPL');
    expect(result.filtered).toBe('[REDACTED:AWS_KEY]');
  });

  // ── Generic Secrets ────────────────────────────────────────────

  it('redacts secret with equals', () => {
    const result = applyPrivacyFilter('secret=my_secret_value');
    expect(result.filtered).toBe('[REDACTED:SECRET]');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('secret');
  });

  it('redacts private_key', () => {
    const result = applyPrivacyFilter('private_key: "abc123defg"');
    expect(result.filtered).toBe('[REDACTED:SECRET]');
    expect(result.redactionCount).toBe(1);
  });

  it('redacts private-key variant', () => {
    const result = applyPrivacyFilter('private-key=some_key_value');
    expect(result.filtered).toBe('[REDACTED:SECRET]');
  });

  // ── Emails ─────────────────────────────────────────────────────

  it('redacts email addresses', () => {
    const result = applyPrivacyFilter('Contact admin@example.com for help.');
    expect(result.filtered).toBe('Contact [REDACTED:EMAIL] for help.');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('email');
  });

  it('redacts multiple email addresses', () => {
    const result = applyPrivacyFilter('CC: user@test.org and other@dev.io');
    expect(result.redactionCount).toBe(2);
    expect(result.filtered).toBe('CC: [REDACTED:EMAIL] and [REDACTED:EMAIL]');
  });

  // ── Phone Numbers ──────────────────────────────────────────────

  it('redacts US phone number with dashes', () => {
    const result = applyPrivacyFilter('Call 555-123-4567 for support.');
    expect(result.filtered).toBe('Call [REDACTED:PHONE] for support.');
    expect(result.redactionCount).toBe(1);
    expect(result.redactionTypes).toContain('phone');
  });

  it('redacts phone with +1 prefix', () => {
    const result = applyPrivacyFilter('Phone: +1-800-555-1234');
    expect(result.filtered).toBe('Phone: [REDACTED:PHONE]');
  });

  it('redacts phone with parentheses', () => {
    const result = applyPrivacyFilter('(212) 555-1234');
    expect(result.filtered).toBe('[REDACTED:PHONE]');
  });

  it('redacts phone with dots', () => {
    const result = applyPrivacyFilter('555.123.4567');
    expect(result.filtered).toBe('[REDACTED:PHONE]');
  });

  // ── Multiple pattern types in one string ───────────────────────

  it('redacts multiple pattern types in a single content block', () => {
    const input = 'Connect via mongodb://admin:pass@host/db and email support@corp.com';
    const result = applyPrivacyFilter(input);
    expect(result.filtered).toContain('[REDACTED:CONNECTION_STRING]');
    expect(result.filtered).toContain('[REDACTED:EMAIL]');
    expect(result.redactionCount).toBe(2);
    expect(result.redactionTypes).toContain('connection-string');
    expect(result.redactionTypes).toContain('email');
  });

  // ── Case insensitivity ─────────────────────────────────────────

  it('is case-insensitive for secret keywords', () => {
    const result = applyPrivacyFilter('API_KEY = "ABCDEFGHIJ1234567890"');
    expect(result.filtered).toBe('[REDACTED:API_KEY]');
  });

  it('is case-insensitive for PASSWORD', () => {
    const result = applyPrivacyFilter('PASSWORD: "SuperSecret123"');
    expect(result.filtered).toBe('[REDACTED:PASSWORD]');
  });

  // ── Edge cases ─────────────────────────────────────────────────

  it('does not redact short values that do not meet minimum length', () => {
    // API key pattern requires 16+ chars; password requires 4+ chars
    const result = applyPrivacyFilter('api_key=ab');
    expect(result.filtered).toBe('api_key=ab');
    expect(result.redactionCount).toBe(0);
  });

  it('handles content that is purely redactable', () => {
    const result = applyPrivacyFilter('password=longpasswordvalue');
    expect(result.filtered).toBe('[REDACTED:PASSWORD]');
    expect(result.redactionCount).toBe(1);
  });

  it('preserves surrounding markdown content', () => {
    const input = '## Config\n\nSet `api_key=ABCDEFGHIJ1234567890` in env.\n\n## Next Steps';
    const result = applyPrivacyFilter(input);
    expect(result.filtered).toContain('## Config');
    expect(result.filtered).toContain('[REDACTED:API_KEY]');
    expect(result.filtered).toContain('## Next Steps');
  });
});
