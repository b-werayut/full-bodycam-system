import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  hasDisallowedCredentialCharacters,
  sanitizeEnglishAlphanumericCredential,
  isEnglishAlphanumericPassword,
  isEnglishAlphanumericUsername,
} from '../src/lib/userValidation.ts';

describe('user validation', () => {
  it('allows usernames with English letters and numbers only', () => {
    assert.equal(isEnglishAlphanumericUsername('Admin123'), true);
    assert.equal(isEnglishAlphanumericUsername('officer01'), true);
    assert.equal(isEnglishAlphanumericUsername('VIEWER'), true);
  });

  it('rejects usernames with spaces, symbols, or non-English characters', () => {
    assert.equal(isEnglishAlphanumericUsername('admin user'), false);
    assert.equal(isEnglishAlphanumericUsername('admin_user'), false);
    assert.equal(isEnglishAlphanumericUsername('admin-user'), false);
    assert.equal(isEnglishAlphanumericUsername('admin@1'), false);
    assert.equal(isEnglishAlphanumericUsername('ผู้ใช้1'), false);
    assert.equal(isEnglishAlphanumericUsername(''), false);
  });

  it('allows passwords with English letters and numbers only', () => {
    assert.equal(isEnglishAlphanumericPassword('Password123'), true);
    assert.equal(isEnglishAlphanumericPassword('ABCxyz789'), true);
  });

  it('rejects passwords with spaces, symbols, or non-English characters', () => {
    assert.equal(isEnglishAlphanumericPassword('password 123'), false);
    assert.equal(isEnglishAlphanumericPassword('password_123'), false);
    assert.equal(isEnglishAlphanumericPassword('password-123'), false);
    assert.equal(isEnglishAlphanumericPassword('password@123'), false);
    assert.equal(isEnglishAlphanumericPassword('รหัส123'), false);
    assert.equal(isEnglishAlphanumericPassword(''), false);
  });

  it('strips non-English alphanumeric characters from credential input', () => {
    assert.equal(sanitizeEnglishAlphanumericCredential('Admin123'), 'Admin123');
    assert.equal(sanitizeEnglishAlphanumericCredential('แอดมินAdmin123'), 'Admin123');
    assert.equal(sanitizeEnglishAlphanumericCredential('pass word_123-@ไทย'), 'password123');
  });

  it('detects disallowed credential characters before sanitizing input', () => {
    assert.equal(hasDisallowedCredentialCharacters('Password123'), false);
    assert.equal(hasDisallowedCredentialCharacters('รหัส123'), true);
    assert.equal(hasDisallowedCredentialCharacters('password_123'), true);
  });
});
