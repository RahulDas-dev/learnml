// Chrome Built-in AI (Prompt API) Integration
// Docs: https://developer.chrome.com/docs/ai/prompt-api

// ── Multimodal prompt types ───────────────────────────────────────────────────
// Ref: https://developer.chrome.com/docs/ai/prompt-api#multimodal_capabilities

/** A single content part inside a prompt message */
export type PromptContentPart =
  | { type: 'text'; value: string }
  | { type: 'image'; value: ImageBitmap | HTMLImageElement | SVGImageElement | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas | Blob | ImageData }
  | { type: 'audio'; value: AudioBuffer | ArrayBufferView | ArrayBuffer | Blob };

/** A full prompt message with role (used for multimodal) */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: PromptContentPart[];
}

/**
 * PromptInput:
 *  - string → plain text prompt (simple case)
 *  - PromptMessage[] → multimodal: [{ role: "user", content: [{type:"image",value:...}, {type:"text",value:...}] }]
 */
export type PromptInput = string | PromptMessage[];

// ── Chrome Prompt API type declarations ───────────────────────────────────────

declare global {
  var LanguageModel: {
    availability: (options?: Pick<LanguageModelCreateOptions, 'expectedInputs' | 'expectedOutputs'>) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
    create: (options?: LanguageModelCreateOptions) => Promise<LanguageModelSession>;
  } | undefined;
}

type ExpectedIOType =
  | { type: 'text'; languages?: string[] }
  | { type: 'image' }
  | { type: 'audio' };

interface LanguageModelCreateOptions {
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  expectedInputs?: ExpectedIOType[];
  expectedOutputs?: ExpectedIOType[];
  monitor?: (m: EventTarget) => void;
  temperature?: number;
  topK?: number;
}

interface PromptOptions {
  signal?: AbortSignal;
  responseConstraint?: Record<string, unknown>;
}

export interface LanguageModelSession {
  promptStreaming: (input: PromptInput, options?: PromptOptions) => ReadableStream<string>;
  prompt: (input: PromptInput, options?: PromptOptions) => Promise<string>;
  clone: () => Promise<LanguageModelSession>;
  contextUsage?: number;
  contextWindow?: number;
  // Token-usage counters vary by Chrome version — read via sessionTokenUsage().
  inputUsage?: number;
  tokensSoFar?: number;
  destroy?: () => void;
}

/**
 * Tokens consumed by a session so far. The Prompt API has renamed this across
 * Chrome versions (`inputUsage`, `contextUsage`, `tokensSoFar`), so we probe all
 * three and fall back to 0 if none is exposed.
 */
export function sessionTokenUsage(session: LanguageModelSession): number {
  return session.inputUsage ?? session.contextUsage ?? session.tokensSoFar ?? 0;
}

export type AIStatus =
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'unavailable'
  | 'unsupported'
  | 'error';

export interface AIInitResult {
  status: AIStatus;
  session?: LanguageModelSession;
  message?: string;
  downloadProgress?: number;
}

// ── Session initialisation ────────────────────────────────────────────────────

export async function initLanguageModel(
  systemPrompt: string,
  // null = download complete, model loading into memory (indeterminate)
  onDownloadProgress?: (percent: number | null) => void,
  options?: { temperature?: number; topK?: number; expectedInputs?: ExpectedIOType[]; expectedOutputs?: ExpectedIOType[] }
): Promise<AIInitResult> {
  if (typeof LanguageModel === 'undefined') {
    return {
      status: 'unsupported',
      message:
        'Chrome Built-in AI is not available. You need Chrome 138+ with the Prompt API flag enabled at chrome://flags/#prompt-api-for-gemini-nano.',
    };
  }

  try {
    // Docs: always pass the same expectedInputs/expectedOutputs to availability() as you pass to create()
    const availability = await LanguageModel.availability({
      ...(options?.expectedInputs  != null && { expectedInputs:  options.expectedInputs }),
      ...(options?.expectedOutputs != null && { expectedOutputs: options.expectedOutputs }),
    });

    if (availability === 'unavailable') {
      return {
        status: 'unavailable',
        message:
          'Gemini Nano is not ready. To fix:\nGo to chrome://components/ → find "Optimization Guide On Device Model" → click "Check for update" and wait.\nFully quit and relaunch Chrome.\nMake sure Hardware Acceleration is ON in chrome://settings/system.',
      };
    }

    if (availability === 'downloadable' || availability === 'downloading') {
      onDownloadProgress?.(0);
    }

    const session = await LanguageModel.create({
      initialPrompts: [{ role: 'system', content: systemPrompt }],
      ...(options?.temperature != null && { temperature: options.temperature }),
      ...(options?.topK != null && { topK: options.topK }),
      ...(options?.expectedInputs  != null && { expectedInputs:  options.expectedInputs }),
      ...(options?.expectedOutputs != null && { expectedOutputs: options.expectedOutputs }),
      monitor(m) {
        m.addEventListener('downloadprogress', (e: Event) => {
          // `loaded` is normally a 0..1 fraction, but some Chrome builds report
          // loaded/total in bytes — handle both.
          const p = e as Event & { loaded?: number; total?: number };
          const loaded = typeof p.loaded === 'number' ? p.loaded : 0;
          const total = typeof p.total === 'number' && p.total > 0 ? p.total : 1;
          const fraction = Math.max(0, Math.min(loaded / total, 1));
          if (fraction >= 1) {
            // Download complete — model is now being loaded into memory (indeterminate)
            onDownloadProgress?.(null);
          } else {
            onDownloadProgress?.(Math.round(fraction * 100));
          }
        });
      },
    });

    return { status: 'ready', session };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message: `Failed to initialize: ${message}` };
  }
}

// ── Prompt helpers ────────────────────────────────────────────────────────────

/** Rough token estimate (~4 chars/token) for when the browser exposes no counter. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function streamResponse(
  session: LanguageModelSession,
  input: PromptInput,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  responseConstraint?: Record<string, unknown>,
  onUsage?: (tokens: number) => void
): Promise<string> {
  const options: PromptOptions = { signal };
  if (responseConstraint) options.responseConstraint = responseConstraint;

  const stream = session.promptStreaming(input, options);
  const reader = stream.getReader();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += value;
      onChunk(fullText);
      // Live, climbing token estimate while streaming (this call's output only).
      onUsage?.(estimateTokens(fullText));
    }
  } finally {
    reader.releaseLock();
  }
  return fullText.trimEnd();
}

export async function getFullResponse(
  session: LanguageModelSession,
  input: PromptInput,
  signal?: AbortSignal,
  responseConstraint?: Record<string, unknown>
): Promise<string> {
  const options: PromptOptions = { signal };
  if (responseConstraint) options.responseConstraint = responseConstraint;
  return session.prompt(input, options);
}

// ── Image helpers ─────────────────────────────────────────────────────────────

/**
 * Convert a base64-encoded PNG/JPEG string to an ImageBitmap.
 * Returns null if conversion fails (e.g. in non-browser environments).
 */
export async function base64ToImageBitmap(base64: string): Promise<ImageBitmap | null> {
  try {
    // Strip data-URL prefix if present
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], { type: 'image/png' });
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}