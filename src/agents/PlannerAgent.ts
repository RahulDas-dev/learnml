import { BaseAgent } from './BaseAgent';
import type { AgentInitOptions } from './BaseAgent';
import { getFullResponse, streamResponse, sessionTokenUsage } from './promptApi';
import type { LanguageModelSession } from './promptApi';
import { pickDistribution, getAnswerSplit } from '@/lib/config';
import type { SlideOutline, QuestionContentType } from '@/lib/config';
import {
  SlideOutlineJsonSchema,
  QuestionBlueprintJsonSchema,
  TopicValidationJsonSchema,
} from './schemas';
import type { QuestionBlueprint } from './schemas';

/** Structured outcome of validating a user-entered quiz topic. */
export interface TopicValidation {
  isValidTopic: boolean;
  validationError: string | null;  // null when valid; reason string when invalid
  topic: string;                   // canonical / rephrased topic name
  overlappedTopic: string;         // comma-separated related/contrasting topics
}

export class PlannerAgent extends BaseAgent {
  protected readonly systemPrompt =
    'You are a Data Science curriculum designer and topic validator. Output only valid JSON when asked. Never output prose or markdown outside of JSON strings.';

  async init(options?: AgentInitOptions) {
    return super.init({ temperature: 0.7, topK: 40, ...options });
  }

  /**
   * Validate a topic and enrich it. Returns whether it is in scope, a canonical
   * rephrasing, related/overlapping areas, and (when invalid) a reason string.
   */
  async validateTopic(topic: string, signal?: AbortSignal): Promise<TopicValidation> {
    if (!this.session) throw new Error('PlannerAgent not initialised');
    const clone: LanguageModelSession = await this.session.clone();
    try {
      const raw = await getFullResponse(
        clone,
        buildValidationPrompt(topic),
        signal,
        TopicValidationJsonSchema as Record<string, unknown>
      );
      return parseTopicValidation(raw, topic);
    } finally {
      clone.destroy?.();
    }
  }

  /** Decompose a topic into slide outlines for the ExplainPage */
  async plan(topic: string, signal?: AbortSignal): Promise<SlideOutline[]> {
    if (!this.session) throw new Error('PlannerAgent not initialised');
    const clone: LanguageModelSession = await this.session.clone();
    try {
      const raw = await getFullResponse(
        clone,
        buildPlanningPrompt(topic),
        signal,
        SlideOutlineJsonSchema as Record<string, unknown>
      );

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length < 3) throw new Error('Invalid slide outline');

      return (parsed as Array<Record<string, unknown>>).map((s) => ({
        title: s.title as string,
        description: s.description as string,
        needsDiagram: Boolean(s.needsDiagram),
        diagramType: (s.diagramType as string) || 'none',
        diagramDescription: (s.diagramDescription as string) || '',
      }));
    } finally {
      clone.destroy?.();
    }
  }

  /**
   * Plan every question before generation starts.
   * Inputs: topic + level (the level fixes the total count and the per-type
   * distribution) + optional overlapping/related areas to broaden subtopics with.
   * Returns one blueprint entry per question, each with a distinct subtopic and
   * detailed context brief the generator turns into a question. Streams the raw
   * JSON plan to `onChunk` as it is produced.
   *
   * The returned blueprint is always exactly `total` entries with the requested
   * type distribution — if the model returns a malformed or short plan, it is
   * deterministically repaired (the subtopics/contexts it did produce are kept).
   * Only an aborted signal propagates as an error.
   */
  async planQuestions(
    topic: string,
    level: string,
    overlappedTopic = '',
    onChunk?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<QuestionBlueprint[]> {
    if (!this.session) throw new Error('PlannerAgent not initialised');

    const dist = pickDistribution(level);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const { multiple: multipleCount } = getAnswerSplit(level);
    const distLines = (Object.entries(dist) as [QuestionContentType, number][])
      .filter(([, n]) => n > 0)
      .map(([type, n]) => `  - ${n} ${type}`)
      .join('\n');

    const clone: LanguageModelSession = await this.session.clone();
    try {
      let planned: Array<Record<string, unknown>> = [];
      try {
        const raw = await streamResponse(
          clone,
          buildQuestionPlanPrompt(topic, level, total, distLines, multipleCount, overlappedTopic),
          onChunk ?? (() => {}),
          signal,
          QuestionBlueprintJsonSchema as Record<string, unknown>
        );
        this.lastTokens = sessionTokenUsage(clone);
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) planned = parsed as Array<Record<string, unknown>>;
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') throw err; // genuine cancel — propagate
        // malformed plan → fall through to deterministic repair below
      }
      return repairBlueprint(planned, dist, total, topic, multipleCount);
    } finally {
      clone.destroy?.();
    }
  }
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildValidationPrompt(topic: string): string {
  return `You are a Data Science topic validator.

A topic is VALID if it falls within (or is any subfield/subtopic of) these areas:
Data Science, Statistics, Machine Learning, Deep Learning, AI, Neural Networks,
NLP, Computer Vision, Python, R, Data Analysis, MLOps, Data Engineering,
Mathematics for ML, Generative AI, Large Language Models (LLMs), Transformers,
Prompt Engineering, RAG, Agentic AI, Diffusion Models, Reinforcement Learning.

Topic to evaluate: "${topic}"

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "isValidTopic": true or false,
  "validationError": "" when valid; otherwise ONE short sentence explaining why it is not a Data Science / AI / ML / Statistics topic,
  "topic": a clean canonical rephrasing of the topic — fix casing/spelling and expand abbreviations (e.g. "kmeans" → "K-Means Clustering Algorithm", "cnn" → "Convolutional Neural Networks"). If invalid, echo the original input.
  "overlappedTopic": when valid, a comma-separated list of 3-5 closely related or contrasting topics worth studying alongside it (e.g. for K-Means → "DBSCAN, Hierarchical Clustering, Silhouette Score, Elbow Method"); when invalid, "".
}

Be strict: clearly non-technical topics (cooking, history, sports, politics, etc.) are INVALID.`;
}

// ── Topic-validation parsing ────────────────────────────────────────────────────

function parseTopicValidation(raw: string, fallbackTopic: string): TopicValidation {
  try {
    const text = raw.trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const slice = start !== -1 && end > start ? text.slice(start, end + 1) : text;
    const obj = JSON.parse(slice) as Record<string, unknown>;

    const isValid = obj.isValidTopic === true || String(obj.isValidTopic).toLowerCase() === 'true';
    const err = typeof obj.validationError === 'string' ? obj.validationError.trim() : '';

    return {
      isValidTopic: isValid,
      validationError: isValid
        ? null
        : (err || `"${fallbackTopic}" doesn't appear to be a Data Science related topic.`),
      topic: (typeof obj.topic === 'string' && obj.topic.trim()) || fallbackTopic,
      overlappedTopic: (typeof obj.overlappedTopic === 'string' && obj.overlappedTopic.trim()) || '',
    };
  } catch {
    // Fail-open: a malformed validation response shouldn't block a legitimate user.
    return { isValidTopic: true, validationError: null, topic: fallbackTopic, overlappedTopic: '' };
  }
}

function buildPlanningPrompt(topicLabel: string): string {
  return `You are a Data Science curriculum designer. Decompose the topic "${topicLabel}" into a sequence of learning slides.

Rules:
- Simple concepts: 6 slides. Moderate: 8-10. Complex/broad: 10-12.
- Order slides from foundational to advanced.
- For each slide, decide if a visual ASCII diagram would help understanding.
- Not every slide needs a diagram. Vary the diagram type based on what best fits the content:
  - "flowchart" — process flows, pipelines, decision paths
  - "tree" — hierarchical structures, decision trees, taxonomies
  - "table" — comparison tables, feature matrices
  - "architecture" — system/model architecture, layer diagrams
  - "graph" — network graphs, node relationships
  - "matrix" — confusion matrices, grid layouts
  - "timeline" — sequential steps, training epochs
  - "none" — no diagram needed
- If needsDiagram is true, set diagramType to one of the types above, and diagramDescription to what it should show.
- If needsDiagram is false, set diagramType to "none" and diagramDescription to empty string.

Output ONLY a raw JSON array, no markdown, no code fences. Start with [ and end with ]

Format: [{"title":"Slide Title","description":"What this slide covers in 1 sentence","needsDiagram":false,"diagramType":"none","diagramDescription":""}]

Example for "Decision Trees":
[
  {"title":"What is a Decision Tree?","description":"High-level intuition of tree-based splitting","needsDiagram":true,"diagramType":"tree","diagramDescription":"Root node splitting into child nodes with feature conditions and leaf predictions"},
  {"title":"Splitting Criteria","description":"Gini impurity vs entropy for choosing splits","needsDiagram":true,"diagramType":"table","diagramDescription":"Comparison table of Gini vs Entropy with formula, range, and usage"},
  {"title":"Overfitting in Trees","description":"Why deep trees overfit and how pruning helps","needsDiagram":false,"diagramType":"none","diagramDescription":""}
]

Now generate the slide plan for "${topicLabel}":`;
}

function buildQuestionPlanPrompt(
  topic: string,
  level: string,
  total: number,
  distLines: string,
  multipleCount: number,
  overlappedTopic: string
): string {
  const overlapLine = overlappedTopic
    ? `\nYou may draw some subtopics from these closely related / contrasting areas too (for breadth and comparison): ${overlappedTopic}.\n`
    : '';

  return `You are planning a ${total}-question Data Science quiz on "${topic}".

Student experience level: ${level}. Calibrate the depth, vocabulary and difficulty of every question to this level — a ${level} learner. (Do NOT output a difficulty field; difficulty is implied by this level.)
${overlapLine}
Use EXACTLY this question-type distribution (counts must match):
${distLines}

First think about which areas of "${topic}" naturally suit each question type, then assign subtopics accordingly:
- math: areas with formulas, derivations, metrics or computations (distances, probabilities, losses, complexity, gradients).
- programming: areas expressible in a short Python/R snippet — implementation, library/API usage, predicting output, or debugging.
- conceptual: definitions, intuitions, comparisons, and when/why to use something.
- case-study: applied real-world scenarios where a method or decision must be chosen and justified.

For each of the ${total} questions provide:
- index: position from 1 to ${total}
- subtopic: the specific concept this question targets, 2-5 words, well-matched to its questionType
- questionType: one of conceptual | math | programming | case-study — respect the counts above
- answerMode: "single" or "multiple" — EXACTLY ${multipleCount} of the ${total} questions must be "multiple", the remaining ${total - multipleCount} must be "single". Prefer multiple-answer for conceptual/case-study subtopics.
- context: a detailed 2-3 sentence brief the question writer will follow. State exactly what to ask, the key idea/formula/snippet/scenario involved, and what distinguishes the correct answer from plausible wrong ones. Give enough information that the writer needs no extra research.

Rules:
- Every subtopic must be DISTINCT — no two questions on the same idea.
- Order questions from foundational to advanced.
- Match each subtopic to a questionType it genuinely fits — never force a non-numeric idea into a math question or a purely theoretical idea into a programming question.

Output ONLY a raw JSON array of ${total} objects. No markdown, no code fences. Start with [ and end with ].
Example item: {"index":1,"subtopic":"Euclidean Distance","questionType":"math","answerMode":"single","context":"Ask the student to compute the Euclidean distance between two 3-D vectors such as (1,2,3) and (4,6,8). The correct answer applies sqrt of the summed squared differences; plausible distractors use Manhattan distance, drop the square root, or mis-square the differences."}`;
}

// ── Blueprint repair ────────────────────────────────────────────────────────────

/**
 * Guarantee a blueprint of exactly `total` entries whose questionType counts match
 * the requested distribution AND whose answerMode contains exactly `multipleCount`
 * "multiple" entries. The model's subtopics/contexts are preserved in order; only
 * counts, types and the multiple/single split are forced. If the model already
 * matched count + distribution its per-question types are kept (so subtopic↔type
 * pairings stay coherent).
 */
function repairBlueprint(
  planned: Array<Record<string, unknown>>,
  dist: Record<QuestionContentType, number>,
  total: number,
  topic: string,
  multipleCount: number
): QuestionBlueprint[] {
  const valid = planned.filter((p) => p && typeof p.subtopic === 'string' && (p.subtopic as string).trim());

  // The exact sequence of types we need, expanded from the distribution.
  const desiredTypes: QuestionContentType[] = [];
  (Object.entries(dist) as [QuestionContentType, number][]).forEach(([type, n]) => {
    for (let i = 0; i < n; i++) desiredTypes.push(type);
  });

  const plannedTypes = valid
    .map((p) => p.questionType)
    .filter((t): t is QuestionContentType => typeof t === 'string') as QuestionContentType[];
  const keepTypes = valid.length === total && sameCounts(plannedTypes, dist);

  const result: QuestionBlueprint[] = [];
  for (let i = 0; i < total; i++) {
    const src = valid[i];
    const srcType = src?.questionType;
    result.push({
      index: i + 1,
      subtopic: (typeof src?.subtopic === 'string' && (src.subtopic as string).trim()) || topic,
      questionType: keepTypes && typeof srcType === 'string'
        ? (srcType as QuestionContentType)
        : desiredTypes[i],
      answerMode: src?.answerMode === 'multiple' ? 'multiple' : 'single',
      context: (typeof src?.context === 'string' && (src.context as string).trim()) || '',
    });
  }

  enforceMultipleCount(result, Math.min(Math.max(multipleCount, 0), total));
  return result;
}

// Multiple-answer questions suit conceptual/case-study best; math/programming least.
// Lower rank = better candidate for "multiple".
const MULTIPLE_PREFERENCE: Record<QuestionContentType, number> = {
  conceptual: 0,
  'case-study': 1,
  programming: 2,
  math: 3,
};

/** Force exactly `target` entries to answerMode "multiple", keeping the model's picks where possible. */
function enforceMultipleCount(entries: QuestionBlueprint[], target: number): void {
  const current = entries.filter((e) => e.answerMode === 'multiple').length;

  if (current > target) {
    // Demote the least-suited multiples first (highest preference rank → math/programming).
    entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.answerMode === 'multiple')
      .sort((a, b) => MULTIPLE_PREFERENCE[b.e.questionType] - MULTIPLE_PREFERENCE[a.e.questionType])
      .slice(0, current - target)
      .forEach(({ i }) => { entries[i].answerMode = 'single'; });
  } else if (current < target) {
    // Promote the best-suited singles first (lowest preference rank → conceptual/case-study).
    entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.answerMode === 'single')
      .sort((a, b) => MULTIPLE_PREFERENCE[a.e.questionType] - MULTIPLE_PREFERENCE[b.e.questionType])
      .slice(0, target - current)
      .forEach(({ i }) => { entries[i].answerMode = 'multiple'; });
  }
}

function sameCounts(types: QuestionContentType[], dist: Record<QuestionContentType, number>): boolean {
  const counts: Record<string, number> = {};
  types.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; });
  return (Object.entries(dist) as [QuestionContentType, number][])
    .every(([type, n]) => (counts[type] ?? 0) === n);
}