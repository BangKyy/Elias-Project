// Shared facts for /syarat, /privasi, /cookies, the English /en/privacy and
// the footer, defined once here. Every statement on those pages describes
// what the code does today; change them together with it.

/** Who develops and runs Elias, as named on the legal pages and in the footer */
export const LEGAL_OPERATOR = 'Sumur Creative';

/** What the operator is, as it reads after its name */
export const LEGAL_OPERATOR_DESCRIPTION = {
  id: 'agensi kreatif di Yogyakarta, Indonesia',
  en: 'a creative agency based in Yogyakarta, Indonesia',
} as const;

export const LEGAL_INSTAGRAM_URL = 'https://www.instagram.com/sumur.creative/';

/** Where privacy and terms questions go */
export const LEGAL_CONTACT_EMAIL = 'sumurcreativenextsenta@gmail.com';

/**
 * When the current versions took effect: one date for /privasi, /syarat,
 * /cookies and /en/privacy. Change it whenever the Indonesian policy changes,
 * and keep the English page in step
 */
export const LEGAL_EFFECTIVE_DATE = '26 November 2026';

/**
 * Whether Elias reads the Pinterest Trends API yet. Until it does, the legal
 * pages call it "being integrated" and say Elias reads no Pinterest data
 * (BR-5); nothing else in the app names Pinterest. Turn on only once API
 * access is approved and the adapter is live
 */
export const PINTEREST_INTEGRATION_LIVE = false;

export const legalDocs = [
  { href: '/syarat', label: 'Syarat & Ketentuan' },
  { href: '/privasi', label: 'Kebijakan Privasi' },
  { href: '/cookies', label: 'Kebijakan Cookie' },
] as const;
