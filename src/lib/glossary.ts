// TODO: the maintained do-not-translate list is Open Question 2.13. Seeded
// from PRD LN-1 plus the terms the AI brief calls out; used as the answer
// until 2.13 is settled (docs/MVP.md, Cross-cutting).

/** Industry terms that stay in English inside Indonesian copy (LN-1). */
export const doNotTranslate = [
  'engagement',
  'reach',
  'awareness',
  'positioning',
  'brief',
  'campaign',
  'insight',
  'moodboard',
  'always-on',
  'archetype',
  'hook',
  'angle',
  'CTA',
  'feed',
  'format',
  'carousel',
  'story',
  'stories',
  'caption',
  'copy',
  'content pillar',
  'short-form video',
  'trend',
];

/**
 * Indonesian renderings of those terms a model may still write, longest
 * first, each mapped back by keepEnglishTerms. Only phrases that mean the
 * marketing term and nothing else: "kampanye" (also an election campaign),
 * "wawasan" ("menambah wawasan"), "sudut pandang", "cerita", "umpan" and
 * "video pendek" stay, since replacing them would break ordinary sentences,
 * and "tren" is the app's own word. A bare "keterlibatan" or "jangkauan" is
 * only replaced next to an audience or a post.
 */
const translations: [pattern: string, term: string][] = [
  ['tingkat keterlibatan', 'engagement rate'],
  ['keterlibatan(?= (?:audiens|pengguna|pengikut|warganet|konsumen))', 'engagement'],
  ['jangkauan(?= (?:audiens|organik|konten|unggahan|postingan|iklan))', 'reach'],
  ['kesadaran (?:akan )?(?:merek|brand)', 'brand awareness'],
  ['pemosisian (?:merek|brand)', 'brand positioning'],
  ['pemosisian', 'positioning'],
  ['ringkasan kreatif', 'creative brief'],
  ['wawasan(?= (?:konsumen|pasar|audiens))', 'insight'],
  ['papan suasana', 'moodboard'],
  ['arketipe', 'archetype'],
  ['kalimat pengait', 'hook'],
  ['ajakan (?:untuk )?bertindak', 'CTA'],
  ['korsel', 'carousel'],
  ['takarir', 'caption'],
  ['pilar konten', 'content pillar'],
];

const translated = translations.map(([pattern, term]) => [new RegExp(`(?<!\\p{L})${pattern}(?!\\p{L})`, 'giu'), term] as const);

/**
 * Puts the English term back where a model translated it (LN-1): "ajakan
 * bertindak" → "CTA", "Kesadaran merek" → "Brand awareness". A term starting
 * a sentence keeps its capital; "CTA" stays as written.
 */
export function keepEnglishTerms(text: string): string {
  return translated.reduce(
    (result, [pattern, term]) =>
      result.replace(pattern, (match) => (/^\p{Lu}/u.test(match) && term !== term.toUpperCase() ? term[0].toUpperCase() + term.slice(1) : term)),
    text,
  );
}
