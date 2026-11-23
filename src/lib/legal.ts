// Shared facts for /syarat, /privasi and /cookies. Every statement on those
// pages describes what the code does today; change them together with it.

/** Who runs Elias, as named on the legal pages */
export const LEGAL_OPERATOR = 'Elias';

/** Where privacy and terms questions go */
export const LEGAL_CONTACT_EMAIL = 'sumurcreativenextsenta@gmail.com';

/**
 * When the current versions took effect, shown on each page. Set it to the
 * day Chat is switched on (NEXT_PUBLIC_CHAT_ENABLED=1), since that adds its passages
 */
export const LEGAL_EFFECTIVE_DATE = '23 November 2026';

export const legalDocs = [
  { href: '/syarat', label: 'Syarat & Ketentuan' },
  { href: '/privasi', label: 'Kebijakan Privasi' },
  { href: '/cookies', label: 'Kebijakan Cookie' },
] as const;
