declare module 'react-katex' {
  import type { ReactNode } from 'react';
  export function InlineMath(props: { math: string }): ReactNode;
  export function BlockMath(props: { math: string }): ReactNode;
}