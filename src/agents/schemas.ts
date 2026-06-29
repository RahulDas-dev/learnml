import { z } from 'zod';

// ── Option content type ────────────────────────────────────────────────────────
// Each answer option can contain different kinds of content.
// The renderer uses optionType to decide how to display it.

export const OptionSchema = z.object({
  content: z.string(),                                          // the text / equation / code / scenario
  optionType: z.enum(['text', 'math', 'code', 'case-study']),  // how to render it
});

export type Option = z.infer<typeof OptionSchema>;

// ── MCQ Question ───────────────────────────────────────────────────────────────
// questionType  = what kind of question it is (content of the question itself)
// answerMode    = how many correct answers (single | multiple) — independent of questionType
// options       = rich-typed answer choices
// correct       = index or array of indices into options[]

export const MCQQuestionObjectSchema = z.object({
  questionType: z.enum(['conceptual', 'math', 'programming', 'case-study']),
  answerMode: z.enum(['single', 'multiple']),
  question: z.string(),
  options: z.array(OptionSchema).min(2).max(6),
  correct: z.union([
    z.number().int().min(0),                          // single correct → index
    z.array(z.number().int().min(0)).min(2),          // multiple correct → indices
  ]),
  code: z.string().optional(),      // code snippet shown above options (for programming questions)
  context: z.string().optional(),   // scenario paragraph (for case-study questions)
  diagram: z.string().optional(),   // rough ASCII draft — refined by AsciiArtAgent
});

export const MCQQuestionSchema = z.array(MCQQuestionObjectSchema).min(1);

export const MCQQuestionJsonSchema = z.toJSONSchema(MCQQuestionSchema);
// Per-question generation constrains the model to a single question object.
export const SingleMCQQuestionJsonSchema = z.toJSONSchema(MCQQuestionObjectSchema);

export type MCQQuestionRaw = z.infer<typeof MCQQuestionObjectSchema>;

// ── Slide Outline ──────────────────────────────────────────────────────────────

export const SlideOutlineSchema = z.array(
  z.object({
    title: z.string(),
    description: z.string(),
    needsDiagram: z.boolean(),
    diagramType: z.enum(['flowchart', 'tree', 'table', 'architecture', 'graph', 'matrix', 'timeline', 'none']),
    diagramDescription: z.string(),
  })
).min(3);

export const SlideOutlineJsonSchema = z.toJSONSchema(SlideOutlineSchema);

// ── Topic validation ───────────────────────────────────────────────────────────
// Structured result of validating a user-entered quiz topic. The model both
// classifies the topic and enriches it (canonical name + overlapping areas).

export const TopicValidationSchema = z.object({
  isValidTopic: z.boolean(),     // is it a Data Science / AI / ML / Stats topic?
  validationError: z.string(),   // "" when valid; one-sentence reason when invalid
  topic: z.string(),             // canonical / rephrased topic (e.g. "Kmeans" → "K-Means Clustering Algorithm")
  overlappedTopic: z.string(),   // comma-separated related/contrasting topics ("" if none/invalid)
});

export const TopicValidationJsonSchema = z.toJSONSchema(TopicValidationSchema);
export type TopicValidationRaw = z.infer<typeof TopicValidationSchema>;

// ── Question Blueprint ─────────────────────────────────────────────────────────
// Produced by PlannerAgent before question generation. One entry per question.
// The QuestionGeneratorAgent writes one question per blueprint entry, using the
// subtopic + hint to keep each question distinct and on-target.

export const QuestionBlueprintSchema = z.array(
  z.object({
    index: z.number().int().min(1),                                          // 1-based position
    subtopic: z.string(),                                                    // specific concept this question targets
    questionType: z.enum(['conceptual', 'math', 'programming', 'case-study']),
    answerMode: z.enum(['single', 'multiple']),
    context: z.string(),                                                     // detailed brief the question writer uses
  })
).min(1);

export const QuestionBlueprintJsonSchema = z.toJSONSchema(QuestionBlueprintSchema);

export type QuestionBlueprint = z.infer<typeof QuestionBlueprintSchema>[number];