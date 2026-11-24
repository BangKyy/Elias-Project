// The Open Food Facts sentence on a Food & Beverage card, composed in code
// from the stored snapshot so the model never writes the number. No imports:
// scripts/off.test.mjs runs this file directly with Node's type stripping.

export type OffEntry = {
  id: string;
  /** Trend tags or words that select this entry, lowercase */
  match: string[];
  /** OFF category tag: the products the number is out of */
  category: string;
  /** "minuman berbasis teh", as it reads after "produk" */
  categoryName: string;
  /** OFF label tag; without one the line is about Nutri-Score */
  label?: string;
  /** "halal", as it reads after "berlabel" */
  labelName?: string;
};

export type TagStat = { n: number; nutriscore: Record<string, number> };

export type OffLine = { line: string; sample: number };

// A share resting on one or two labelled products is a weak number: no line
const MIN_LABELLED = 5;

const percent = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`;

/**
 * Every entry the trend's tags or claim name, whole words only, in watchlist
 * order: the first that yields a line wins, so a specific entry with too few
 * products falls back to a broader one.
 */
export function matchEntries(entries: OffEntry[], tags: string[], signal: string): OffEntry[] {
  const text = ` ${[...tags, signal].join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return entries.filter((entry) => entry.match.some((word) => text.includes(` ${word.toLowerCase()} `)));
}

/**
 * The line, or null when the sample is under `minSample` or the number would
 * be a weak one (fewer than MIN_LABELLED products with the label, which more
 * likely means contributors skipped the label than that products lack it).
 * The sample size is always in the sentence, and the sentence is about OFF,
 * never the market.
 */
export function composeOffLine(entry: OffEntry, category: TagStat | null, pair: number | null, minSample: number): OffLine | null {
  if (!category) return null;
  if (entry.label && entry.labelName) {
    if (category.n < minSample || !pair || pair < MIN_LABELLED) return null;
    return {
      line: `Dari ${category.n.toLocaleString('id-ID')} produk ${entry.categoryName} Indonesia di Open Food Facts, ${percent(pair, category.n)} berlabel ${entry.labelName}.`,
      sample: category.n,
    };
  }
  const graded = ['a', 'b', 'c', 'd', 'e'].reduce((sum, grade) => sum + (category.nutriscore[grade] ?? 0), 0);
  if (graded < minSample) return null;
  const high = (category.nutriscore.a ?? 0) + (category.nutriscore.b ?? 0);
  const low = (category.nutriscore.d ?? 0) + (category.nutriscore.e ?? 0);
  return {
    line: `Dari ${graded.toLocaleString('id-ID')} produk ${entry.categoryName} Indonesia di Open Food Facts yang punya Nutri-Score, ${percent(high, graded)} bernilai A atau B dan ${percent(low, graded)} bernilai D atau E.`,
    sample: graded,
  };
}
