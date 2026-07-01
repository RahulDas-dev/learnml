import { BaseAgent } from './BaseAgent';
import type { AgentInitOptions } from './BaseAgent';
import { streamResponse, sessionTokenUsage, estimateTokens, measureTokens } from './promptApi';
import type { LanguageModelSession } from './promptApi';
import type { MCQQuestion, OptionContentType } from '@/lib/config';
import { SingleMCQQuestionJsonSchema } from './schemas';
import type { QuestionBlueprint } from './schemas';

// How many times to attempt each question. On-device Gemini Nano occasionally
// errors or falls into a repetition loop (aborted by the guards below); a couple
// of retries — helped by temperature randomness — recover most dropped slots.
const MAX_ATTEMPTS_PER_QUESTION = 3;

// Hard ceiling on how long a single question may stream before we abort it.
// Gemini Nano sometimes falls into a repetition loop (e.g. "\boldsymbol{\boldsymbol{…")
// that never closes the JSON, which would otherwise hang the whole batch.
const PER_QUESTION_TIMEOUT_MS = 45000;

// A real single-question JSON object is well under this. If the stream blows past
// it, the model is looping — abort immediately rather than waiting for the timeout.
const RUNAWAY_CHAR_LIMIT = 8000;

// We reuse ONE session across questions (cloning per question is slow). To stop the
// growing conversation from filling the context window, we "compact" it once the
// free space drops to this fraction of the window — i.e. ~75% used. Since questions
// are independent we compact by resetting to a fresh session (clearing history)
// rather than summarising. Ref: https://developer.chrome.com/docs/ai/session-compacting
const COMPACT_WHEN_REMAINING_RATIO = 0.25;

// Fallback window size if the browser doesn't expose session.contextWindow.
const ASSUMED_CONTEXT_WINDOW = 4096;

// Preview builds of the Prompt API enforce a per-prompt input limit (~1024 tokens).
// We warn (not block) if a prompt looks larger, so a silent truncation doesn't
// masquerade as a bad question in the logs.
const PER_PROMPT_TOKEN_LIMIT = 1024;

export class QuestionGeneratorAgent extends BaseAgent {
  protected readonly systemPrompt =
    'You are a Data Science quiz generator. Follow instructions exactly. Output only valid JSON when asked for a question.';

  // Shared working session reused across questions, plus an estimated running token
  // count for when the browser exposes no real context counter.
  private genSession: LanguageModelSession | null = null;
  private estimatedContextTokens = 0;

  async init(options?: AgentInitOptions) {
    return super.init({ temperature: 0.9, topK: 40, ...options });
  }

  destroy(): void {
    this.genSession?.destroy?.();
    this.genSession = null;
    super.destroy();
  }

  /** Get the reused generation session, cloning a fresh one from the base if needed. */
  private async getGenSession(): Promise<LanguageModelSession> {
    if (!this.session) throw new Error('QuestionGeneratorAgent not initialised');
    if (!this.genSession) {
      this.genSession = await this.session.clone();
      this.estimatedContextTokens = 0;
    }
    return this.genSession;
  }

  /** Drop the working session (its context is cleared); the next use clones fresh. */
  private resetGenSession(): void {
    this.genSession?.destroy?.();
    this.genSession = null;
    this.estimatedContextTokens = 0;
  }

  /**
   * Compact the working session if its free context has dropped to
   * COMPACT_WHEN_REMAINING_RATIO of the window. Uses the real counter when the
   * browser exposes it, otherwise an estimated running token total.
   */
  private compactIfNeeded(addedTokens: number): void {
    const s = this.genSession;
    if (!s) return;
    this.estimatedContextTokens += addedTokens;

    const window = s.contextWindow && s.contextWindow > 0 ? s.contextWindow : ASSUMED_CONTEXT_WINDOW;
    const used = s.contextUsage && s.contextUsage > 0 ? s.contextUsage : this.estimatedContextTokens;
    const remainingRatio = 1 - Math.min(used / window, 1);

    if (remainingRatio <= COMPACT_WHEN_REMAINING_RATIO) {
      this.resetGenSession();
    }
  }

  /**
   * Generate every question from the planner's blueprint — one model call per
   * question, **sequentially on a single reused session** (cloning per question is
   * slow). Gemini Nano can't reliably serve concurrent prompts, so we run one at a
   * time, retry any dropped slot up to MAX_ATTEMPTS_PER_QUESTION, and compact the
   * session when its context fills.
   *
   * `onProgress` reports the number of questions **successfully** produced so far
   * (not attempts) plus the running total of tokens consumed, so the UI counter
   * never overstates. `onStream` receives the latest streamed tokens for live
   * output. Results keep blueprint order.
   */
  async generateQuestions(
    topic: string,
    level: string,
    blueprints: QuestionBlueprint[],
    onProgress: (completed: number, tokens: number) => void,
    signal?: AbortSignal,
    onStream?: (text: string) => void
  ): Promise<MCQQuestion[]> {
    if (!this.session) throw new Error('QuestionGeneratorAgent not initialised');

    const results: Array<MCQQuestion | null> = new Array(blueprints.length).fill(null);
    let succeeded = 0;
    let completedTokens = 0; // tokens from finished attempts

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_QUESTION; attempt++) {
      if (signal?.aborted) break;
      // Pass over every still-unfilled slot.
      for (let i = 0; i < blueprints.length; i++) {
        if (signal?.aborted) break;
        if (results[i]) continue;

        const q = await this.generateOneQuestion(
          topic, level, blueprints[i], signal, onStream,
          // Live cumulative tokens = finished attempts + this question's running usage.
          (live) => onProgress(succeeded, completedTokens + live)
        ).catch((err: unknown) => {
          console.error(
            `[QuestionGenerator] question #${i + 1} (${blueprints[i].questionType}/${blueprints[i].subtopic}) threw on attempt ${attempt + 1}:`,
            err
          );
          return null;
        });

        if (!q && !signal?.aborted) {
          console.warn(
            `[QuestionGenerator] question #${i + 1} (${blueprints[i].questionType}/${blueprints[i].subtopic}) produced no valid question on attempt ${attempt + 1}/${MAX_ATTEMPTS_PER_QUESTION}.`
          );
        }

        completedTokens += this.lastTokens; // count tokens whether the attempt succeeded or not
        if (q) {
          results[i] = q;
          succeeded += 1;
        }
        onProgress(succeeded, completedTokens);
      }
      if (results.every((r) => r !== null)) break; // all slots filled — done early
    }

    this.resetGenSession(); // release the shared session once the batch is done

    if (succeeded < blueprints.length && !signal?.aborted) {
      const missing = results
        .map((q, i) => (q ? null : `#${i + 1} ${blueprints[i].questionType}/${blueprints[i].subtopic}`))
        .filter(Boolean);
      console.warn(
        `[QuestionGenerator] generated ${succeeded}/${blueprints.length} questions after ${MAX_ATTEMPTS_PER_QUESTION} attempts. Still missing:`,
        missing
      );
    }

    return results.filter((q): q is MCQQuestion => q !== null);
  }

  /**
   * Generate a single question for one blueprint entry on the **shared** working
   * session (reused across questions for speed). After a successful question the
   * session is compacted if its context is nearly full; if the call aborts/fails
   * (timeout or runaway loop) the session is reset so its polluted context can't
   * bleed into later questions. Resolves to null on a dropped question.
   */
  async generateOneQuestion(
    topic: string,
    level: string,
    blueprint: QuestionBlueprint,
    signal?: AbortSignal,
    onStream?: (text: string) => void,
    onUsage?: (tokens: number) => void
  ): Promise<MCQQuestion | null> {
    if (!this.session) throw new Error('QuestionGeneratorAgent not initialised');
    const session = await this.getGenSession();
    const before = sessionTokenUsage(session); // context tokens before this turn

    // Per-question abort controller chained to the batch signal + timeout + length guard.
    const ctrl = new AbortController();
    const onParentAbort = () => ctrl.abort();
    if (signal) {
      if (signal.aborted) ctrl.abort();
      else signal.addEventListener('abort', onParentAbort, { once: true });
    }
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, PER_QUESTION_TIMEOUT_MS);

    let guardTripped = false;
    const onChunk = (text: string) => {
      onStream?.(text);
      if (!guardTripped && text.length > RUNAWAY_CHAR_LIMIT) {
        guardTripped = true;
        ctrl.abort();   // looping output — stop early
      }
    };

    const prompt = buildSingleQuestionPrompt(topic, level, blueprint);
    if (estimateTokens(prompt) > PER_PROMPT_TOKEN_LIMIT) {
      console.warn(
        `[QuestionGenerator] prompt for "${blueprint.subtopic}" (~${estimateTokens(prompt)} tokens) may exceed the ~${PER_PROMPT_TOKEN_LIMIT}-token per-prompt limit; the model could truncate it.`
      );
    }

    try {
      const raw = await streamResponse(
        session,
        prompt,
        onChunk,
        ctrl.signal,
        SingleMCQQuestionJsonSchema as Record<string, unknown>,
        (t) => { onUsage?.(t); } // live per-question estimate
      );
      // This turn's tokens = context delta (real), or an accurate measurement of
      // the output as a fallback when the browser exposes no usage counter.
      const after = sessionTokenUsage(session);
      this.lastTokens = after > before ? after - before : await measureTokens(session, raw);
      const q = parseSingleQuestion(raw, blueprint);
      if (!q) {
        console.error(
          `[QuestionGenerator] failed to parse a valid question from the model output for "${blueprint.subtopic}" (${blueprint.questionType}). Raw output:\n`,
          raw
        );
      }
      this.compactIfNeeded(this.lastTokens); // reset session if context is nearly full
      return q;
    } catch (err: unknown) {
      // Timeout / runaway / parent cancel — the aborted turn may have polluted the
      // shared context, so reset the session before the next question/retry.
      this.lastTokens = estimateTokens(blueprint.subtopic + blueprint.context);
      this.resetGenSession();
      if ((err as Error).name === 'AbortError') {
        if (guardTripped) {
          console.error(
            `[QuestionGenerator] aborted "${blueprint.subtopic}" (${blueprint.questionType}): runaway output exceeded ${RUNAWAY_CHAR_LIMIT} chars (model looping).`
          );
        } else if (timedOut) {
          console.error(
            `[QuestionGenerator] aborted "${blueprint.subtopic}" (${blueprint.questionType}): timed out after ${PER_QUESTION_TIMEOUT_MS} ms.`
          );
        }
        // else: parent batch cancelled — expected, no log.
        return null;
      }
      throw err; // unexpected error — logged by the batch loop's catch
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onParentAbort);
    }
  }
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildSingleQuestionPrompt(
  topicLabel: string,
  level: string,
  bp: QuestionBlueprint
): string {
  const typeRules = TYPE_RULES[bp.questionType];

  const answerRule = bp.answerMode === 'multiple'
    ? '- "answerMode": "multiple" — exactly 2 or 3 options are correct. "correct" is an array of those indices, e.g. [0, 2]. End the question text with "(Select all that apply)".'
    : '- "answerMode": "single" — exactly ONE option is correct. "correct" is a single integer index, e.g. 2.';

  return `Write ONE ${bp.questionType} multiple-choice question about "${topicLabel}" for a ${level}-level student.

Subtopic: ${bp.subtopic}
Difficulty: calibrate to a ${level} learner — match the depth, vocabulary, and how tricky the distractors are to ${level} level (easier for beginner, deeper/edge-case for advanced/expert).
Brief: ${bp.context || `Test understanding of ${bp.subtopic}.`}

${typeRules}

Universal rules:
- Do NOT repeat or rephrase any question you have already generated in this session — this question must be distinct and focused only on the subtopic above.
- Exactly 4 options. Every option MUST be distinct, complete, and plausible.
- NEVER use placeholder or filler options such as "print(x)", "TODO", "None of the above", "All of the above", or repeated/near-identical options.
- Exactly one set of correct answer(s); the wrong options must be genuinely incorrect but believable.
${answerRule}
- Wrap ALL math in delimiters: $...$ for inline, $$...$$ for block. LaTeX must be valid KaTeX: every \\frac needs TWO brace groups \\frac{a}{b}; wrap words in \\text{...}; never write a command immediately followed by letters.

Output ONLY a single raw JSON object — no markdown, no code fences, no explanation. Start with { and end with }.

Format:
{
  "questionType": "${bp.questionType}",
  "answerMode": "${bp.answerMode}",
  "question": "Question text with optional $LaTeX$",
  "options": [ {"content": "...", "optionType": "text"|"math"|"code"|"case-study"}, ... 4 items ],
  "correct": ${bp.answerMode === 'multiple' ? '[0, 2]' : '0'}${bp.questionType === 'programming' ? ',\n  "code": "optional shared snippet — OMIT for \\"which snippet is correct\\" questions"' : ''}${bp.questionType === 'case-study' ? ',\n  "context": "3-5 sentence real-world scenario"' : ''}
}`;
}

const TYPE_RULES: Record<QuestionBlueprint['questionType'], string> = {
  conceptual:
    `Type rules (conceptual):
- Options are plain text or short math expressions ("text" or "math" optionType).
- Do NOT include a "code" or "context" field.`,
  math:
    `Type rules (math):
- The question MUST contain LaTeX (e.g. $\\frac{a}{b}$, $\\sum_{i=1}^{n} x_i$, $O(n^2)$).
- Options are math expressions with optionType "math". Make them numerically/algebraically distinct.
- Do NOT include a "code" or "context" field.`,
  programming:
    `Type rules (programming):
- For "which snippet is correct" questions: put each candidate snippet as an option with optionType "code", and OMIT the top-level "code" field. Do NOT add a separate placeholder code block.
- For "what does this code do / output" questions: put the shared snippet in the "code" field, and make the options plain "text".
- EVERY code option must be syntactically valid and runnable. The correct one must actually produce the right result; wrong ones must be plausible but incorrect (wrong API/shape/argument, off-by-one, etc.).`,
  'case-study':
    `Type rules (case-study):
- Include a "context" field with a 3-5 sentence real-world scenario.
- Options describe approaches/decisions with optionType "case-study".`,
};

// ── JSON parsing ────────────────────────────────────────────────────────────────

/**
 * The AI sometimes outputs LaTeX like \frac bare inside JSON strings (without escaping
 * the backslash). JSON.parse treats \f as form-feed, \b as backspace, \n as newline —
 * corrupting LaTeX commands. Fix: double-escape any unescaped \X where X is a JSON
 * control-char letter followed by more letters (a LaTeX command, not a real escape).
 */
function fixLatexBackslashes(text: string): string {
  return text.replace(/(?<!\\)\\([bfnrt])(?=[a-zA-Z])/g, '\\\\$1');
}

function parseSingleQuestion(raw: string, bp: QuestionBlueprint): MCQQuestion | null {
  const cleaned = raw.trim().replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
  const text = fixLatexBackslashes(cleaned);

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let obj: unknown;
  try {
    obj = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (Array.isArray(obj)) obj = obj[0];
  if (!isValidQuestion(obj)) return null;

  return toMCQ(obj as Record<string, unknown>, bp);
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

function toMCQ(obj: Record<string, unknown>, bp: QuestionBlueprint): MCQQuestion {
  const validContentTypes = ['conceptual', 'math', 'programming', 'case-study'] as const;
  const rawQType = obj.questionType as string;
  const questionType = validContentTypes.includes(rawQType as typeof validContentTypes[number])
    ? (rawQType as MCQQuestion['questionType'])
    : bp.questionType;

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
