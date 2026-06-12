const ENGLISH_ALPHANUMERIC_CREDENTIAL_PATTERN = /^[A-Za-z0-9]+$/;
const NON_ENGLISH_ALPHANUMERIC_CREDENTIAL_PATTERN = /[^A-Za-z0-9]/g;

// Username must be more than 3 characters (i.e. at least 4).
export const USERNAME_MIN_LENGTH = 4;
// Password must be at least 6 characters.
export const PASSWORD_MIN_LENGTH = 6;

export function isEnglishAlphanumericUsername(username: string) {
  return ENGLISH_ALPHANUMERIC_CREDENTIAL_PATTERN.test(username);
}

export function isUsernameLengthValid(username: string) {
  return username.trim().length >= USERNAME_MIN_LENGTH;
}

export function isPasswordLengthValid(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH;
}

export function isEnglishAlphanumericPassword(password: string) {
  return ENGLISH_ALPHANUMERIC_CREDENTIAL_PATTERN.test(password);
}

export function sanitizeEnglishAlphanumericCredential(value: string) {
  return value.replace(NON_ENGLISH_ALPHANUMERIC_CREDENTIAL_PATTERN, '');
}

export function hasDisallowedCredentialCharacters(value: string) {
  return NON_ENGLISH_ALPHANUMERIC_CREDENTIAL_PATTERN.test(value);
}
