import { useState } from 'react';
import type { ReactNode } from 'react';

function generateRandomCells(cols: number, rows: number, percent: number) {
  const total = cols * rows;
  const count = Math.round((total * percent) / 100);
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * total));
  }
  return Array.from(indices).map((i) => ({
    col: i % cols,
    row: Math.floor(i / cols),
  }));
}

export function GridBackground({ children }: { children: ReactNode }) {
  const [cells] = useState(() => generateRandomCells(40, 30, 3));

  return (
    <div className="min-h-screen bg-background grid-pattern relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {cells.map((cell, i) => (
          <div
            key={i}
            className="absolute w-[40px] h-[40px] bg-foreground/[0.03]"
            style={{ left: `${cell.col * 40}px`, top: `${cell.row * 40}px` }}
          />
        ))}
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
}