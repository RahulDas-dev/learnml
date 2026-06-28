import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Renders a string that may contain LaTeX math expressions.
 * - $$...$$  → block math (display mode)
 * - $...$    → inline math
 * - plain text segments are rendered as <span>
 */
export function MathText({ text }: { text: string }) {
  const parts = splitMath(text);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'block') {
          return (
            <span key={i} className="block my-2">
              <BlockMath math={part.content} />
            </span>
          );
        }
        if (part.type === 'inline') {
          return <InlineMath key={i} math={part.content} />;
        }
        return <span key={i}>{part.content}</span>;
      })}
    </>
  );
}

type MathPart =
  | { type: 'text'; content: string }
  | { type: 'inline'; content: string }
  | { type: 'block'; content: string };

function splitMath(text: string): MathPart[] {
  const parts: MathPart[] = [];
  let i = 0;

  while (i < text.length) {
    // Check for $$...$$
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        parts.push({ type: 'block', content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Check for $...$
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1);
      if (end !== -1) {
        parts.push({ type: 'inline', content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Plain text — accumulate until next $
    const nextDollar = text.indexOf('$', i);
    if (nextDollar === -1) {
      parts.push({ type: 'text', content: text.slice(i) });
      break;
    }
    parts.push({ type: 'text', content: text.slice(i, nextDollar) });
    i = nextDollar;
  }

  return parts;
}