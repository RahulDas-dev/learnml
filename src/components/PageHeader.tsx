import type React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  onBack: () => void;
  title?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ onBack, title, action, children }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={1.75} />
          </Button>
          {title && <span className="font-bold text-sm text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</span>}
          {children}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Home" aria-label="Home">
            <Home size={16} strokeWidth={1.75} />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}