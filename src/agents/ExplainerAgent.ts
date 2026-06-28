import { BaseAgent } from './BaseAgent';
import type { AgentInitOptions } from './BaseAgent';
import { streamResponse } from './promptApi';
import type { LanguageModelSession } from './promptApi';
import type { SlideOutline, MCQQuestion } from '@/lib/config';
import type { AnswerValue } from '@/context/MockTestContext';

declare global {
  var Summarizer: {
    create: (options?: SummarizerOptions) => Promise<SummarizerInstance>;
  } | undefined;
}

interface SummarizerOptions {
  type?: 'key-points' | 'tldr' | 'teaser' | 'headline';
  format?: 'plain-text' | 'markdown';
  length?: 'short' | 'medium' | 'long';
}

interface SummarizerInstance {
  summarize: (text: string) => Promise<string>;
  destroy?: () => void;
}

export class ExplainerAgent extends BaseAgent {
  protected readonly systemPrompt =
    'You are a world-class Data Science educator. Explain concepts clearly, use examples, include ASCII diagrams and LaTeX equations where helpful. Never output raw JSON.';

  private chatSession: LanguageModelSession | null = null;

  async init(options?: AgentInitOptions) {
    return super.init({ temperature: 0.8, topK: 40, ...options });
  }

  /** Generate slide content for one slide */
  async generateSlide(
    topic: string,
    slide: SlideOutline,
    slideIndex: number,
    totalSlides: number,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.session) throw new Error('ExplainerAgent not initialised');
    const clone = await this.session.clone();
    try {
      return await streamResponse(clone, buildSlidePrompt(topic, slide, slideIndex, totalSlides), onChunk, signal);
    } finally {
      clone.destroy?.();
    }
  }

  /**
   * Explain a quiz question and user's answer.
   * Uses a fresh cloned session per question — no context bleed between questions.
   */
  async explainQuestion(
    question: MCQQuestion,
    userAnswer: AnswerValue,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.session) throw new Error('ExplainerAgent not initialised');
    const clone = await this.session.clone();
    try {
      return await streamResponse(clone, buildQuestionExplanationPrompt(question, userAnswer), onChunk, signal);
    } finally {
      clone.destroy?.();
    }
  }

  /** Clone base session into an isolated chat session */
  async startChat(): Promise<void> {
    if (!this.session) throw new Error('ExplainerAgent not initialised');
    this.chatSession?.destroy?.();
    this.chatSession = await this.session.clone();
  }

  /** Send a chat message on the isolated chat session */
  async chat(
    userMessage: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.chatSession) throw new Error('Chat session not started — call startChat() first');
    return streamResponse(this.chatSession, userMessage, onChunk, signal);
  }

  /** Summarize text using Chrome Summarizer API or truncation fallback */
  async summarize(text: string, type: 'key-points' | 'tldr' = 'key-points'): Promise<string> {
    if (typeof Summarizer !== 'undefined') {
      try {
        const summarizer = await Summarizer.create({ type, format: 'plain-text', length: 'short' });
        const result = await summarizer.summarize(text);
        summarizer.destroy?.();
        return result;
      } catch { /* fall through */ }
    }
    return text.slice(0, 300);
  }

  destroy(): void {
    this.chatSession?.destroy?.();
    this.chatSession = null;
    super.destroy();
  }
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildSlidePrompt(
  topicLabel: string,
  slide: SlideOutline,
  slideIndex: number,
  totalSlides: number
): string {
  const diagramInstruction = slide.needsDiagram
    ? `\n\nINCLUDE an ASCII ${slide.diagramType} diagram wrapped in a code block (\`\`\`\n...\n\`\`\`) that illustrates: ${slide.diagramDescription}.
Guidelines for the diagram:
- For flowcharts/architecture: use box-drawing characters (┌─┐│└─┘), arrows (→ ← ↑ ↓)
- For trees: use branch characters (├── └── │) with indentation
- For tables: use pipe characters (|) and dashes (-) with aligned columns
- For matrices/grids: use aligned rows and columns with borders
- For graphs: use nodes with connecting lines/arrows
- For timelines: use sequential markers with descriptions
Make it clear, well-formatted, and visually distinct.`
    : '';

  return `You are a Data Science educator creating slide ${slideIndex + 1} of ${totalSlides} on the topic "${topicLabel}".

This slide's title: "${slide.title}"
This slide covers: ${slide.description}

Rules:
- Start with ## ${slide.title}
- Write 100-200 words of clear, educational content
- Use **bold** for key terms, \`code\` for technical terms
- Include math equations where relevant using this format: $equation$ for inline, $$equation$$ for block equations. Use standard LaTeX notation (e.g. $\\sum_{i=1}^{n} x_i$, $\\frac{a}{b}$, $\\nabla$)
- Use bullet points for lists
- Be concise — this is one slide, not a full article${diagramInstruction}

Generate the slide content now:`;
}

function buildQuestionExplanationPrompt(question: MCQQuestion, userAnswer: AnswerValue): string {
  const correctArr = Array.isArray(question.correct) ? question.correct : [question.correct];
  const correctLabels = correctArr
    .map((c) => `${String.fromCharCode(65 + c)}) ${question.options[c].content}`)
    .join(', ');

  let userLabel = 'User skipped this question';
  if (userAnswer !== null) {
    const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    userLabel = `User chose: ${userArr.map((u) => `${String.fromCharCode(65 + u)}) ${question.options[u].content}`).join(', ')}`;
  }

  const codeSection = question.code ? `\nCode:\n\`\`\`\n${question.code}\n\`\`\`\n` : '';
  const contextSection = question.context ? `\nScenario: ${question.context}\n` : '';
  const diagramSection = question.diagram ? `\nDiagram:\n\`\`\`\n${question.diagram}\n\`\`\`\n` : '';
  const optionsList = question.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.content}`).join(', ');

  return `Provide an in-depth explanation for this ${question.questionType} question.
${contextSection}${codeSection}${diagramSection}
Question: ${question.question}
Options: ${optionsList}
Correct answer(s): ${correctLabels}
${userLabel}

Provide a thorough explanation:
1. Why the correct answer(s) are right
2. Why each wrong option is incorrect
3. The underlying concept being tested

When helpful, include an ASCII diagram to visualize the concept. Wrap diagrams in triple backticks.
Use **bold** for key terms. Be educational and detailed.`;
}