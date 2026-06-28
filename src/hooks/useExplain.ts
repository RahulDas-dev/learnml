import { useContext } from 'react';
import { ExplainContext } from '@/context/ExplainContext';
import type { ExplainContextValue } from '@/context/ExplainContext';

export function useExplain(): ExplainContextValue {
  const ctx = useContext(ExplainContext);
  if (!ctx) throw new Error('useExplain must be used inside ExplainProvider');
  return ctx;
}