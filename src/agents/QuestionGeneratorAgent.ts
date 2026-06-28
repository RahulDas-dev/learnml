import { BaseAgent } from './BaseAgent';
import type { AgentInitOptions } from './BaseAgent';
import { streamResponse } from './promptApi';
import type { LanguageModelSession } from './promptApi';
import { pickDistribution } from '@/lib/config';
import type { MCQQuestion, OptionContentType } from '@/lib/config';
import { MCQQuestionJsonSchema } from './schemas';
import type { QuestionBlueprint } from './schemas';

export class QuestionGeneratorAgent extends BaseAgent {
  protected readonly systemPrompt =
    'You are a Data Science quiz generator. Follow instructions exactly. Output only valid JSON when asked for questions.';

  async init(options?: AgentInitOptions) {
    return super.init({ temperature: 1.5, topK: 40, ...options });
  }

  /**
   * Generate questions guided by the blueprint from PlannerAgent.
   * Streams generation and calls onProgress with an estimated completed count.
   */
  async generateQuestions(
    topic: string,
    level: string,
    _blueprints: QuestionBlueprint[],
    onProgress: (completed: number, partialText: string) => void,
    signal?: AbortSignal
  ): Promise<MCQQuestion[]> {
    if (!this.session) throw new Error('QuestionGeneratorAgent not initialised');

    const prompt = buildMockTestPrompt(topic, level);

    let fullText = '';
    const onChunk = (text: string) => {
      fullText = text;
      // Count actual question objects by looking for "question": occurrences
      const questionsDetected = (text.match(/"question"\s*:/g) ?? []).length;
      onProgress(questionsDetected, text);
    };

    const clone: LanguageModelSession = await this.session.clone();
    try {
      await streamResponse(
        clone,
        prompt,
        onChunk,
        signal,
        MCQQuestionJsonSchema as Record<string, unknown>
      );
      return parseQuestions(fullText);
    } finally {
      clone.destroy?.();
    }
  }
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildMockTestPrompt(topicLabel: string, level: string): string {
  const dist = pickDistribution(level);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);

  const sections: string[] = [];

  if (dist.conceptual > 0) {
    sections.push(`${dist.conceptual} CONCEPTUAL questions:
  - "questionType": "conceptual"
  - "answerMode": "single" or "multiple" (mix both)
  - Options are plain text or short math expressions
  - Each option: {"content": "...", "optionType": "text"} or {"content": "$expr$", "optionType": "math"}`);
  }

  if (dist.math > 0) {
    sections.push(`${dist.math} MATH questions:
  - "questionType": "math"
  - "answerMode": "single" or "multiple"
  - Question MUST contain LaTeX: $\\sum$, $\\frac{a}{b}$, $\\nabla$, $O(n^2)$, etc.
  - Options are math expressions: {"content": "$O(n^2)$", "optionType": "math"}
  - Include "diagram" field with ASCII visualization when helpful`);
  }

  if (dist.programming > 0) {
    sections.push(`${dist.programming} PROGRAMMING questions:
  - "questionType": "programming"
  - "answerMode": "single" or "multiple"
  - Include "code" field with a Python/R snippet
  - Options can be code snippets: {"content": "print(x)", "optionType": "code"} or plain text
  - Include "diagram" field with ASCII flow when relevant`);
  }

  if (dist['case-study'] > 0) {
    sections.push(`${dist['case-study']} CASE STUDY questions:
  - "questionType": "case-study"
  - "answerMode": "single" or "multiple"
  - Include "context" field with a real-world scenario (3-5 sentences)
  - Options are scenario-based: {"content": "Use approach X because...", "optionType": "case-study"}
  - Include "diagram" field with ASCII architecture when helpful`);
  }

  return `Generate exactly ${total} diverse questions about "${topicLabel}" for ${level} level.

IMPORTANT: Output ONLY a raw JSON array. No markdown, no code fences, no backticks, no explanation.
Start your response with [ and end with ]

Question types needed:
${sections.join('\n\n')}

JSON format (each question):
{
  "questionType": "conceptual"|"math"|"programming"|"case-study",
  "answerMode": "single"|"multiple",
  "question": "Question text with optional $LaTeX$",
  "options": [
    {"content": "Option text or $equation$ or code", "optionType": "text"|"math"|"code"|"case-study"},
    ...
  ],
  "correct": 0,
  "code": "...",
  "context": "...",
  "diagram": "..."
}

Rules:
- options: 4 items, each is an object {content, optionType}
- For "multiple" answerMode, correct is an array e.g. [0, 2]
- For "multiple" answerMode, add "(Select all that apply)" hint at end of question
- Make questions varied and appropriate for ${level} level
- Output exactly ${total} objects
- Start response with [ character immediately`;
}

// ── JSON parser ───────────────────────────────────────────────────────────────

/**
 * The AI sometimes outputs LaTeX like \frac bare inside JSON strings (without escaping
 * the backslash). JSON.parse treats \f as form-feed, \b as backspace, \n as newline —
 * corrupting LaTeX commands. Fix: double-escape any unescaped \X where X is a JSON
 * control-char letter followed by more letters (a LaTeX command, not a real escape).
 * Uses negative lookbehind to avoid corrupting already-correct \\frac sequences.
 */
function fixLatexBackslashes(text: string): string {
  return text.replace(/(?<!\\)\\([bfnrt])(?=[a-zA-Z])/g, '\\\\$1');
}

function parseQuestions(raw: string): MCQQuestion[] {
  const cleaned = raw.trim().replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

  let text = fixLatexBackslashes(cleaned);
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);

  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return (parsed as Array<Record<string, unknown>>).filter(isValidQuestion).map(toMCQ);
    }
  } catch {
    // fall through to brace extractor
  }

  // Brace-counting fallback for streamed partial JSON
  const questions: MCQQuestion[] = [];
  let depth = 0;
  let objStart = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try {
          const obj = JSON.parse(fixLatexBackslashes(text.slice(objStart, i + 1))) as Record<string, unknown>;
          if (isValidQuestion(obj)) questions.push(toMCQ(obj));
        } catch { /* skip */ }
        objStart = -1;
      }
    }
  }
  return questions;
}

function isValidQuestion(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const q = obj as Record<string, unknown>;
  if (typeof q.question !== 'string' || q.question.length === 0) return false;
  if (!Array.isArray(q.options) || q.options.length < 2) return false;

  const validOptions = q.options.every((o: unknown) => {
    if (typeof o === 'string') return (o as string).trim().length > 0;
    if (o && typeof o === 'object') {
      const opt = o as Record<string, unknown>;
      return typeof opt.content === 'string' && (opt.content as string).trim().length > 0;
    }
    return false;
  });
  if (!validOptions) return false;

  const optCount = q.options.length;
  if (typeof q.correct === 'number') {
    if (q.correct < 0 || q.correct >= optCount) return false;
  } else if (Array.isArray(q.correct)) {
    if (!q.correct.every((v: unknown) => typeof v === 'number' && v >= 0 && v < optCount)) return false;
  } else {
    return false;
  }
  return true;
}

let _idCounter = 1;

function toMCQ(obj: Record<string, unknown>): MCQQuestion {
  const validContentTypes = ['conceptual', 'math', 'programming', 'case-study'] as const;
  const rawQType = obj.questionType as string;
  const questionType = validContentTypes.includes(rawQType as typeof validContentTypes[number])
    ? (rawQType as MCQQuestion['questionType'])
    : 'conceptual';

  const answerMode: MCQQuestion['answerMode'] =
    (obj.answerMode as string) === 'multiple' ? 'multiple' : 'single';

  const rawOptions = (obj.options as unknown[]) ?? [];
  const options: MCQQuestion['options'] = rawOptions.map((o) => {
    if (typeof o === 'string') return { content: o, optionType: 'text' as OptionContentType };
    const opt = o as Record<string, unknown>;
    const validOptTypes = ['text', 'math', 'code', 'case-study'] as const;
    const optType = validOptTypes.includes(opt.optionType as typeof validOptTypes[number])
      ? (opt.optionType as OptionContentType)
      : 'text';
    return { content: (opt.content as string) ?? '', optionType: optType };
  });

  return {
    id: _idCounter++,
    questionType,
    answerMode,
    question: obj.question as string,
    options,
    correct: obj.correct as number | number[],
    ...(obj.code ? { code: obj.code as string } : {}),
    ...(obj.context ? { context: obj.context as string } : {}),
    ...(obj.diagram ? { diagram: obj.diagram as string } : {}),
  };
}