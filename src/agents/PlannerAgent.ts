import { BaseAgent } from './BaseAgent';
import type { AgentInitOptions } from './BaseAgent';
import { getFullResponse } from './promptApi';
import type { LanguageModelSession } from './promptApi';
import { pickDistribution } from '@/lib/config';
import type { SlideOutline, QuestionContentType } from '@/lib/config';
import {
  SlideOutlineJsonSchema,
  QuestionBlueprintJsonSchema,
  BooleanJsonSchema,
} from './schemas';
import type { QuestionBlueprint } from './schemas';

export class PlannerAgent extends BaseAgent {
  protected readonly systemPrompt =
    'You are a Data Science curriculum designer and topic validator. Output only valid JSON when asked. Never output prose or markdown outside of JSON strings.';

  async init(options?: AgentInitOptions) {
    return super.init({ temperature: 0.7, topK: 40, ...options });
  }

  /** Validate whether a topic is Data Science related */
  async validateTopic(topic: string, signal?: AbortSignal): Promise<boolean> {
    if (!this.session) throw new Error('PlannerAgent not initialised');
    const clone: LanguageModelSession = await this.session.clone();
    try {
      const raw = await getFullResponse(
        clone,
        buildValidationPrompt(topic),
        signal,
        BooleanJsonSchema as Record<string, unknown>
      );
      return raw.trim().toLowerCase() === 'true';
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

  /** Produce a blueprint describing every question before generation starts */
  async blueprintQuestions(
    topic: string,
    level: string,
    signal?: AbortSignal
  ): Promise<QuestionBlueprint[]> {
    if (!this.session) throw new Error('PlannerAgent not initialised');

    const dist = pickDistribution(level);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const distLines = (Object.entries(dist) as [QuestionContentType, number][])
      .filter(([, n]) => n > 0)
      .map(([type, n]) => `  - ${n} × ${type}`)
      .join('\n');

    const clone: LanguageModelSession = await this.session.clone();
    try {
      const raw = await getFullResponse(
        clone,
        buildQuestionBlueprintPrompt(topic, level, total, distLines),
        signal,
        QuestionBlueprintJsonSchema as Record<string, unknown>
      );

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Invalid blueprint');
      return parsed as QuestionBlueprint[];
    } finally {
      clone.destroy?.();
    }
  }
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildValidationPrompt(topic: string): string {
  return `Is "${topic}" related to any of these fields: Data Science, Statistics, Machine Learning, Deep Learning, AI, Neural Networks, NLP, Computer Vision, Python, R, Data Analysis, MLOps, Data Engineering, Mathematics for ML, or any subfield of these?

Answer with true or false only.`;
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

function buildQuestionBlueprintPrompt(
  topic: string,
  level: string,
  total: number,
  distLines: string
): string {
  return `Plan exactly ${total} quiz questions about "${topic}" for ${level} level.

Question type breakdown:
${distLines}

For each question, decide:
- questionType: "conceptual" | "math" | "programming" | "case-study"
- answerMode: "single" or "multiple" (mix both, ~30% multiple)
- title: one-line summary of what the question tests
- needsImage: whether an ASCII diagram would help understanding
- latexEquations: list of LaTeX expressions that will appear (e.g. ["O(n^2)", "\\\\nabla J"])
- hasCode: whether a code snippet is needed (programming questions usually yes)
- hasContext: whether a scenario paragraph is needed (case-study always yes)
- optionTypes: array of content types for each of the 4 options — "text" | "math" | "code" | "case-study"
- difficulty: "conceptual" | "applied" | "derivation" | "debugging"

Output a JSON array of ${total} blueprint objects, one per question.`;
}