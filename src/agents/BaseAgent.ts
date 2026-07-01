import { initLanguageModel } from './promptApi';
import type { AIInitResult, AIStatus, LanguageModelSession } from './promptApi';

export interface AgentInitOptions {
  temperature?: number;
  topK?: number;
  onDownloadProgress?: (percent: number | null) => void;
  expectedInputs?: Array<{ type: 'text'; languages?: string[] } | { type: 'image' } | { type: 'audio' }>;
  expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>;
}

export abstract class BaseAgent {
  protected session: LanguageModelSession | null = null;
  protected abstract readonly systemPrompt: string;
  private _status: AIStatus = 'checking';

  /** Tokens consumed by the most recent clone operation (0 if not exposed). */
  lastTokens = 0;

  async init(options?: AgentInitOptions): Promise<AIInitResult> {
    const result = await initLanguageModel(
      this.systemPrompt,
      options?.onDownloadProgress,
      {
        temperature: options?.temperature,
        topK: options?.topK,
        // Declare English text I/O by default. Chrome's Prompt API warns and can
        // degrade quality/safety if no output language is specified; agents can
        // still override for multimodal or other languages.
        expectedInputs: options?.expectedInputs ?? [{ type: 'text', languages: ['en'] }],
        expectedOutputs: options?.expectedOutputs ?? [{ type: 'text', languages: ['en'] }],
      }
    );
    if (result.status === 'ready' && result.session) {
      this.session = result.session;
    }
    this._status = result.status;
    return result;
  }

  async clone(): Promise<LanguageModelSession | null> {
    return this.session?.clone() ?? null;
  }

  destroy(): void {
    this.session?.destroy?.();
    this.session = null;
  }

  get isReady(): boolean {
    return this.session !== null && this._status === 'ready';
  }

  get contextUsage(): number | null {
    if (!this.session?.contextUsage || !this.session?.contextWindow) return null;
    return this.session.contextUsage / this.session.contextWindow;
  }
}