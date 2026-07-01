import type React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HomeButton } from '@/components/HomeButton';

interface PageHeaderProps {
  title?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, action, children }: PageHeaderProps) {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HomeButton />
          {title && <span className="font-bold text-sm text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</span>}
          {children}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}