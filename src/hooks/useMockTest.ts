import { useContext } from 'react';
import { MockTestContext } from '@/context/MockTestContext';
import type { MockTestContextValue } from '@/context/MockTestContext';

export function useMockTest(): MockTestContextValue {
  const ctx = useContext(MockTestContext);
  if (!ctx) throw new Error('useMockTest must be used inside MockTestProvider');
  return ctx;
}