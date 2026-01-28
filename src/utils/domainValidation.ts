/**
 * Domain validation utilities for form submissions
 */

// Common invalid patterns to block
const INVALID_PATTERNS = [
  /^test$/i,
  /^example$/i,
  /^demo$/i,
  /^sample$/i,
  /^asdf/i,
  /^qwerty/i,
  /^123/,
  /^abc$/i,
  /^xxx/i,
  /^no\s*website/i,
  /^n\/a$/i,
  /^none$/i,
  /^null$/i,
  /^undefined$/i,
  /calle\s+\d/i, // Street addresses
  /^\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd)/i, // Address patterns
];

// Common email patterns (user entered email instead of domain)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid TLDs (common ones)
const COMMON_TLDS = [
  'com', 'org', 'net', 'io', 'co', 'ai', 'app', 'dev', 'me', 'info', 'biz',
  'edu', 'gov', 'uk', 'de', 'fr', 'es', 'it', 'nl', 'au', 'ca', 'jp', 'cn',
  'in', 'br', 'mx', 'ru', 'us', 'tech', 'online', 'store', 'shop', 'site',
  'xyz', 'club', 'blog', 'agency', 'digital', 'media', 'marketing', 'solutions'
];

export interface DomainValidationResult {
  isValid: boolean;
  cleanedDomain: string;
  warning?: string;
  errorType?: 'email' | 'invalid_pattern' | 'no_tld' | 'too_short' | 'gibberish';
}

/**
 * Validates and cleans a domain input
 */
export function validateDomain(input: string): DomainValidationResult {
  if (!input?.trim()) {
    return {
      isValid: false,
      cleanedDomain: '',
      warning: 'Please enter a website URL',
      errorType: 'too_short'
    };
  }

  // Clean up the URL
  let cleanUrl = input.trim().toLowerCase();
  
  // Remove protocol
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    cleanUrl = cleanUrl.replace(/^https?:\/\/(www\.)?/, '');
  } else {
    cleanUrl = cleanUrl.replace(/^(www\.)?/, '');
  }
  
  // Remove path, query params, fragments
  cleanUrl = cleanUrl.replace(/[\/\?#].*$/, '');

  // Check if it's an email address
  if (EMAIL_PATTERN.test(input.trim())) {
    return {
      isValid: false,
      cleanedDomain: cleanUrl,
      warning: 'This looks like an email address. Please enter your website domain (e.g., yourcompany.com)',
      errorType: 'email'
    };
  }

  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(cleanUrl)) {
      return {
        isValid: false,
        cleanedDomain: cleanUrl,
        warning: 'Please enter a valid business website URL',
        errorType: 'invalid_pattern'
      };
    }
  }

  // Check minimum length
  if (cleanUrl.length < 4) {
    return {
      isValid: false,
      cleanedDomain: cleanUrl,
      warning: 'Domain name is too short. Please enter a complete URL (e.g., yourcompany.com)',
      errorType: 'too_short'
    };
  }

  // Check for TLD
  const hasDot = cleanUrl.includes('.');
  const parts = cleanUrl.split('.');
  const potentialTld = parts[parts.length - 1];
  const hasValidTld = hasDot && COMMON_TLDS.includes(potentialTld);

  // Basic domain format check
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  const isValidFormat = domainRegex.test(cleanUrl);

  if (!hasDot) {
    // No TLD at all - likely incomplete
    return {
      isValid: false,
      cleanedDomain: cleanUrl,
      warning: `Did you mean "${cleanUrl}.com"? Please include the domain extension.`,
      errorType: 'no_tld'
    };
  }

  if (!isValidFormat) {
    // Has a dot but invalid format - show warning but allow
    return {
      isValid: true, // Allow with warning
      cleanedDomain: cleanUrl,
      warning: 'This domain format looks unusual. Results may be inaccurate.',
      errorType: 'gibberish'
    };
  }

  if (!hasValidTld) {
    // Valid format but uncommon TLD - show warning but allow
    return {
      isValid: true,
      cleanedDomain: cleanUrl,
      warning: 'Uncommon domain extension detected. Results may vary.',
    };
  }

  // All good!
  return {
    isValid: true,
    cleanedDomain: cleanUrl
  };
}
