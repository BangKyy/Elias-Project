import { Fragment } from 'react';

// An Elias reply is plain text (the model writes no markdown, cleanReply strips
// what slips through), shaped by the chat prompt: the answer on the first
// line, then paragraphs or a numbered list whose items open with "Label:".
// This reads that shape back into a hierarchy; any reply, older ones too,
// still renders, at worst as plain paragraphs.

type Block = { kind: 'paragraph'; text: string } | { kind: 'ordered' | 'bullets'; items: string[] };

const ORDERED = /^\d{1,2}[.)]\s+(.+)$/;
const BULLET = /^[-•*]\s+(.+)$/;
// "Hook: ..." — at most four words, then a colon and a space, which a time
// ("16:30") or a link ("https://") never has
const LABEL = /^([^:\n]{2,40}?):\s+([\s\S]+)$/;
// The answer when the model didn't give it a line of its own: the first sentence
const FIRST_SENTENCE = /^([^\n]{20,240}?[.?])\s+(?=["“(]?[A-Z0-9])/;

export function replyBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let open = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const last = blocks.at(-1);
    if (!line) {
      open = false;
      continue;
    }
    const ordered = ORDERED.exec(line);
    const bullet = ordered ? null : BULLET.exec(line);
    if (ordered || bullet) {
      const kind = ordered ? 'ordered' : 'bullets';
      const item = (ordered ?? bullet)![1];
      // Items stay one list across blank lines between them
      if (last?.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
      open = false;
    } else if (open && last?.kind === 'paragraph') {
      last.text += `\n${line}`;
    } else {
      blocks.push({ kind: 'paragraph', text: line });
      open = true;
    }
  }
  return blocks;
}

function splitLabel(text: string): { label: string | null; rest: string } {
  const match = LABEL.exec(text);
  if (!match || match[1].trim().split(/\s+/).length > 4) return { label: null, rest: text };
  return { label: match[1].trim(), rest: match[2] };
}

function Labelled({ text }: { text: string }) {
  const { label, rest } = splitLabel(text);
  return label ? (
    <>
      <strong className="font-semibold text-txt-white">{label}:</strong> {rest}
    </>
  ) : (
    text
  );
}

/** The reply inside its bubble: the answer first and largest, then the details. */
export default function ReplyText({ text }: { text: string }) {
  const blocks = replyBlocks(text);
  const first = blocks[0];
  // The answer: the reply's first sentence, unless it opens with a label
  // ("Slide 1: ..."), which makes it a detail rather than an answer
  let lead: string | null = null;
  if (first?.kind === 'paragraph' && !splitLabel(first.text).label) {
    const sentence = FIRST_SENTENCE.exec(first.text);
    if (sentence) {
      lead = sentence[1];
      blocks[0] = { kind: 'paragraph', text: first.text.slice(sentence[0].length) };
    } else if (!first.text.includes('\n') && first.text.length <= 240) {
      lead = first.text;
      blocks.shift();
    }
  }

  return (
    <div className="flex flex-col gap-3 break-words">
      {lead && <p className="text-lg leading-snug font-semibold text-txt-white">{lead}</p>}
      {blocks.map((block, i) => {
        if (block.kind === 'paragraph') {
          return (
            <p key={i} className="text-md text-paper">
              {/* Each line may open with its own label ("Slide 2: ...") */}
              {block.text.split('\n').map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Labelled text={line} />
                </Fragment>
              ))}
            </p>
          );
        }
        const List = block.kind === 'ordered' ? 'ol' : 'ul';
        return (
          <List key={i} className="flex flex-col gap-2 text-md text-paper">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2.5">
                <span aria-hidden className="mt-[3px] w-5 shrink-0 font-mono text-xs font-bold text-primary">
                  {block.kind === 'ordered' ? `${j + 1}.` : '•'}
                </span>
                <span>
                  <Labelled text={item} />
                </span>
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
