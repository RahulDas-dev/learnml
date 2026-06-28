// ── Experience levels ─────────────────────────────────────────────────────────

export const EXPERIENCE_LEVELS = [
  { id: 'beginner',     label: 'Beginner',     icon: 'Sprout', description: 'No prior knowledge — building fundamentals' },
  { id: 'intermediate', label: 'Intermediate', icon: 'Flame',  description: 'Familiar with basics — applied concepts' },
  { id: 'advanced',     label: 'Advanced',     icon: 'Rocket', description: 'Strong foundation — in-depth theory' },
  { id: 'expert',       label: 'Expert',       icon: 'Crown',  description: 'Research-level — edge cases & nuances' },
];

// ── MCQ types ─────────────────────────────────────────────────────────────────

export type QuestionContentType = 'conceptual' | 'math' | 'programming' | 'case-study';
export type AnswerMode = 'single' | 'multiple';
export type OptionContentType = 'text' | 'math' | 'code' | 'case-study';

export interface MCQOption {
  content: string;
  optionType: OptionContentType;
}

export interface MCQQuestion {
  id: number;
  questionType: QuestionContentType;
  answerMode: AnswerMode;
  question: string;
  options: MCQOption[];
  correct: number | number[];
  code?: string;
  context?: string;
  diagram?: string;
}

// ── Level config ──────────────────────────────────────────────────────────────

export interface LevelDistribution {
  conceptual: [number, number];
  math: [number, number];
  programming: [number, number];
  caseStudy: [number, number];
}

export interface LevelConfig {
  duration: number;
  durationLabel: string;
  total: number;
  distribution: LevelDistribution;
}

export const LEVEL_CONFIG: Record<string, LevelConfig> = {
  beginner: {
    duration: 7 * 60,
    durationLabel: '7 min',
    total: 10,
    distribution: { conceptual: [7, 10], math: [0, 0], programming: [0, 0], caseStudy: [0, 0] },
  },
  intermediate: {
    duration: 15 * 60,
    durationLabel: '15 min',
    total: 15,
    distribution: { conceptual: [5, 8], math: [2, 4], programming: [3, 6], caseStudy: [0, 0] },
  },
  advanced: {
    duration: 20 * 60,
    durationLabel: '20 min',
    total: 18,
    distribution: { conceptual: [4, 6], math: [3, 5], programming: [4, 6], caseStudy: [2, 3] },
  },
  expert: {
    duration: 20 * 60,
    durationLabel: '20 min',
    total: 20,
    distribution: { conceptual: [3, 4], math: [4, 6], programming: [5, 7], caseStudy: [3, 5] },
  },
};

/** Pick question counts per content type that sum to the level total */
export function pickDistribution(level: string): Record<QuestionContentType, number> {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.intermediate;
  const d = config.distribution;
  const total = config.total;

  let conceptual  = randInt(d.conceptual[0],  d.conceptual[1]);
  let math        = randInt(d.math[0],        d.math[1]);
  let programming = randInt(d.programming[0], d.programming[1]);
  let caseStudy   = randInt(d.caseStudy[0],   d.caseStudy[1]);
  let sum = conceptual + math + programming + caseStudy;

  while (sum !== total) {
    if (sum < total) {
      if      (conceptual  < d.conceptual[1])  { conceptual++;  sum++; }
      else if (math        < d.math[1])        { math++;        sum++; }
      else if (programming < d.programming[1]) { programming++; sum++; }
      else if (caseStudy   < d.caseStudy[1])   { caseStudy++;   sum++; }
      else { conceptual++; sum++; }
    } else {
      if      (conceptual  > d.conceptual[0])  { conceptual--;  sum--; }
      else if (programming > d.programming[0]) { programming--; sum--; }
      else if (math        > d.math[0])        { math--;        sum--; }
      else if (caseStudy   > d.caseStudy[0])   { caseStudy--;   sum--; }
      else { conceptual--; sum--; }
    }
  }

  return { conceptual, math, programming, 'case-study': caseStudy };
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ── Slide types ───────────────────────────────────────────────────────────────

export interface SlideOutline {
  title: string;
  description: string;
  needsDiagram: boolean;
  diagramType: string;
  diagramDescription: string;
}

export interface SlideContent {
  title: string;
  body: string;
  generated: boolean;
}