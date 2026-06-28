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

export const MCQQuestionSchema = z.array(
  z.object({
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
  })
).min(1);

export const MCQQuestionJsonSchema = z.toJSONSchema(MCQQuestionSchema);

export type MCQQuestionRaw = z.infer<typeof MCQQuestionSchema>[number];

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

// ── Boolean (topic validation) ─────────────────────────────────────────────────

export const BooleanJsonSchema = z.toJSONSchema(z.boolean());

// ── Question Blueprint ─────────────────────────────────────────────────────────
// Produced by PlannerAgent before question generation.
// Describes what each question will contain — shown to user as a preview.

export const QuestionBlueprintSchema = z.array(
  z.object({
    index: z.number().int().min(1),
    questionType: z.enum(['conceptual', 'math', 'programming', 'case-study']),
    answerMode: z.enum(['single', 'multiple']),
    title: z.string(),                     // one-line summary of what the question tests
    needsImage: z.boolean(),               // whether an ASCII diagram is needed
    latexEquations: z.array(z.string()),   // LaTeX expressions that will appear
    hasCode: z.boolean(),                  // whether a code snippet is needed
    hasContext: z.boolean(),               // whether a scenario paragraph is needed
    optionTypes: z.array(                  // content type expected for each option
      z.enum(['text', 'math', 'code', 'case-study'])
    ).min(2).max(6),
    difficulty: z.enum(['conceptual', 'applied', 'derivation', 'debugging']),
  })
).min(1);

export const QuestionBlueprintJsonSchema = z.toJSONSchema(QuestionBlueprintSchema);

export type QuestionBlueprint = z.infer<typeof QuestionBlueprintSchema>[number];