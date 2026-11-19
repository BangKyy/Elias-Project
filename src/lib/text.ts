/**
 * The first `max` UTF-16 units of `text`, never ending in half an emoji, with
 * any other lone surrogate replaced. Postgres rejects a lone surrogate in
 * json/jsonb (22P02), which failed the YouTube snapshot save on 19 Nov 2026.
 */
export function truncate(text: string, max: number): string {
  const cut = text.slice(0, max);
  return (/[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut).toWellFormed();
}
