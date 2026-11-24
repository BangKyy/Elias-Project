import { creativeRoleLabels, type CreativeRole } from '../creativeRoles';
import type { NewsContext } from '../gdelt';
import type { Verdict } from '../insights/types';
import { formatYouTubeTrends, type YouTubeTrends } from '../youtube';
import { executionFormatLabels, newsProviderLabel, newsWindowLabel, type EliasInsight } from './types';

export const decisionLabels: Record<Verdict, string> = { act: 'Eksekusi', watch: 'Pantau', skip: 'Lewati' };

type BriefInput = {
  trendTopic: string;
  role: CreativeRole;
  insight: EliasInsight;
  news: NewsContext;
  youtube: YouTubeTrends;
};

/**
 * The whole call as plain text: the API's `result`, "Salin Brief", and the
 * note saved to Arsip all use this, so they always read the same.
 */
export function executionBrief({ trendTopic, role, insight, news, youtube }: BriefInput): string {
  const lines = [
    'MAKE IT TODAY — Elias',
    `Tren: ${trendTopic}`,
    `Keputusan: ${decisionLabels[insight.decision]}`,
    `Peran: ${creativeRoleLabels[role]}`,
    '',
    insight.headline,
    `So what: ${insight.soWhat}`,
  ];
  if (insight.decision !== 'skip') {
    lines.push(`Format: ${executionFormatLabels[insight.action.format]}`, `Angle: ${insight.action.angle}`);
    if (insight.action.steps.length) lines.push('Langkah:', ...insight.action.steps.map((step, i) => `${i + 1}. ${step}`));
    if (insight.copy) lines.push('Copy:', `Hook: ${insight.copy.hook}`, `Caption: ${insight.copy.caption}`, `CTA: ${insight.copy.cta}`);
  }
  lines.push(`Kenapa: ${insight.why}`);
  if (news.status === 'ok') lines.push('', `Konteks berita (${newsProviderLabel(news)}, ${newsWindowLabel(news, 'id')}):`, news.summary);
  if (youtube.status === 'ok') lines.push('', `Trending YouTube ${youtube.regionCode} hari ini:`, formatYouTubeTrends(youtube));
  return lines.join('\n');
}

export type ParsedBrief = {
  decision: Verdict | null;
  headline: string;
  soWhat: string | null;
  format: string | null;
  angle: string | null;
  steps: string[];
  copy: { hook: string; caption: string; cta: string } | null;
  why: string | null;
  /** Anything else in the note, such as text added in the note editor */
  extra: string;
};

/** "Label: value" from the first line starting with that label */
const valueOf = (lines: string[], label: string) => {
  const line = lines.find((l) => l.startsWith(`${label}: `));
  return line ? line.slice(label.length + 2) : null;
};

/**
 * Reads a note written by executionBrief back into its parts, for Arsip's
 * note box. The news and YouTube context it appends is left out; lines it
 * doesn't recognise, like ones typed in the editor, end up in `extra`.
 * Null when the note isn't a brief.
 */
export function parseBrief(note: string): ParsedBrief | null {
  const lines = note.split('\n');
  if (!lines[0]?.startsWith('MAKE IT TODAY')) return null;
  const headerEnd = lines.indexOf('', 1);
  if (headerEnd < 0 || !lines[headerEnd + 1]) return null;
  const label = valueOf(lines.slice(1, headerEnd), 'Keputusan');
  const decision = (Object.keys(decisionLabels) as Verdict[]).find((verdict) => decisionLabels[verdict] === label) ?? null;

  const bodyEnd = lines.indexOf('', headerEnd + 1) < 0 ? lines.length : lines.indexOf('', headerEnd + 1);
  const [headline, ...body] = lines.slice(headerEnd + 1, bodyEnd);
  const known = /^(So what|Format|Angle|Hook|Caption|CTA|Kenapa): |^(Langkah|Copy):$|^\d+\. /;
  const unknown = body.filter((line) => !known.test(line));
  const hook = valueOf(body, 'Hook');
  const caption = valueOf(body, 'Caption');
  const cta = valueOf(body, 'CTA');

  // Blocks after the body, split on blank lines, minus the context executionBrief appends
  const rest = lines.slice(bodyEnd + 1).join('\n').split(/\n{2,}/);
  const added = rest.filter((block) => block.trim() && !/^(Konteks berita|Trending YouTube)/.test(block));

  return {
    decision,
    headline,
    soWhat: valueOf(body, 'So what'),
    format: valueOf(body, 'Format'),
    angle: valueOf(body, 'Angle'),
    steps: body.filter((line) => /^\d+\. /.test(line)).map((line) => line.replace(/^\d+\. /, '')),
    copy: hook && caption && cta ? { hook, caption, cta } : null,
    why: valueOf(body, 'Kenapa'),
    extra: [...(unknown.length ? [unknown.join('\n')] : []), ...added].join('\n\n'),
  };
}

export type BriefParts = {
  /** "MAKE IT TODAY", Tren, Keputusan and Peran: hidden by the note box */
  header: string;
  /** Headline onwards, what the note box shows */
  shown: string;
  /** The news and YouTube context executionBrief appends, also hidden */
  context: string;
};

const isContext = (block: string) => /^(Konteks berita|Trending YouTube)/.test(block);

/**
 * A brief note split for the note editor, so it edits only what Arsip's note
 * box shows. Null when the note isn't a brief.
 */
export function splitBrief(note: string): BriefParts | null {
  if (!parseBrief(note)) return null;
  const lines = note.split('\n');
  const headerEnd = lines.indexOf('', 1);
  const blocks = lines.slice(headerEnd + 1).join('\n').split(/\n{2,}/);
  return {
    header: lines.slice(0, headerEnd).join('\n'),
    shown: blocks.filter((block) => !isContext(block)).join('\n\n'),
    context: blocks.filter(isContext).join('\n\n'),
  };
}

/** The edited text put back between the parts the editor hid; empty clears the note. */
export function joinBrief({ header, context }: BriefParts, shown: string): string {
  return shown ? [header, shown, context].filter(Boolean).join('\n\n') : '';
}
