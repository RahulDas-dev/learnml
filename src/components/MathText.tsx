import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Renders a string that may contain LaTeX math expressions.
 * - $$...$$  → block math (display mode)
 * - $...$    → inline math
 * - plain text segments are rendered as <span>
 *
 * The on-device model often emits slightly malformed LaTeX. We normalize the
 * common mistakes before handing it to KaTeX, and when KaTeX still can't parse
 * it we fall back to a readable plain-text approximation instead of KaTeX's
 * default red error source.
 */
export function MathText({ text }: { text: string }) {
  const parts = splitMath(text);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'block') {
          const math = normalizeLatex(part.content);
          return (
            <span key={i} className="block my-2">
              <BlockMath
                math={math}
                renderError={() => <span className="text-muted-foreground">{prettifyLatex(part.content)}</span>}
              />
            </span>
          );
        }
        if (part.type === 'inline') {
          const math = normalizeLatex(part.content);
          return (
            <InlineMath
              key={i}
              math={math}
              renderError={() => <span className="text-muted-foreground">{prettifyLatex(part.content)}</span>}
            />
          );
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

/**
 * Fix the most common malformed-LaTeX patterns the on-device model produces,
 * so KaTeX can render them properly.
 */
function normalizeLatex(s: string): string {
  return s
    .trim()
    // `\textsum` / `\textmean` → `\text{sum}` (model drops the braces)
    .replace(/\\(text|mathrm|mathbf|mathit|operatorname)([a-zA-Z]+)/g, '\\$1{$2}');
}

/**
 * Last-resort: turn LaTeX KaTeX can't parse into readable plain text instead
 * of showing raw `\frac`-style commands in red.
 */
function prettifyLatex(s: string): string {
  return s
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1) / ($2)')
    .replace(/\\frac\b/g, '') // bare \frac with no brace args — meaningless, drop it
    .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)([a-zA-Z]+)/g, '$1')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\leq?\b/g, '≤')
    .replace(/\\geq?\b/g, '≥')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
    .replace(/\\[a-zA-Z]+/g, (m) => m.slice(1))
    .replace(/[{}$]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
