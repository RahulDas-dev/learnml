import { useEffect, useState } from 'react';

export type AICapability = 'checking' | 'supported' | 'unsupported';

/**
 * Lightweight, synchronous-ish check for whether this browser exposes the
 * Chrome Built-in AI Prompt API (`window.LanguageModel`). Used on the landing
 * page to flag unsupported browsers immediately on load, without booting an
 * agent or downloading the model.
 */
export function useAICapability(): AICapability {
  const [capability, setCapability] = useState<AICapability>('checking');

  useEffect(() => {
    const hasApi = typeof (globalThis as { LanguageModel?: unknown }).LanguageModel !== 'undefined';
    setCapability(hasApi ? 'supported' : 'unsupported');
  }, []);

  return capability;
}
