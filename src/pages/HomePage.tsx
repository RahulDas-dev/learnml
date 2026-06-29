import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FlaskConical, BookOpen, ArrowRight, Sigma } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-11 h-11 rounded-xl border border-border bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-foreground group-hover:border-foreground transition-all duration-200">
      {children}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-base text-foreground tracking-tight flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            <Sigma size={20} strokeWidth={2} />
            DS Learn
          </span>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-16 fade-in">
          <Badge variant="outline" className="gap-2 px-3 py-1 rounded-full bg-secondary mb-6 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
            <span className="text-xs mono text-muted-foreground tracking-wide">Powered by Chrome Built-in AI</span>
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-5 leading-tight tracking-tight">
            Master<br />Data Science
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            AI-generated mock tests and in-depth topic explanations — all running privately in your browser via Gemini Nano.
          </p>
        </div>

        {/* CTA Cards */}
        <div className="grid sm:grid-cols-2 gap-5 mb-16 fade-in-1">
          {/* Mock Test */}
          <Card
            onClick={() => navigate('/mock-test')}
            className="group cursor-pointer hover:-translate-y-0.5 p-8 text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <IconBox>
                <FlaskConical size={20} strokeWidth={1.5} className="text-foreground group-hover:text-background transition-colors duration-200" />
              </IconBox>
              <h2 className="text-xl font-bold text-foreground">Mock Test</h2>
            </div>
            <p className="text-muted-foreground text-sm font-mono leading-relaxed mb-6">
              Type any Data Science topic, choose your experience level — AI generates a fresh test every time.
            </p>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Start Test
              <ArrowRight size={14} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* Explain Topic */}
          <Card
            onClick={() => navigate('/explain')}
            className="group cursor-pointer hover:-translate-y-0.5 p-8 text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <IconBox>
                <BookOpen size={20} strokeWidth={1.5} className="text-foreground group-hover:text-background transition-colors duration-200" />
              </IconBox>
              <h2 className="text-xl font-bold text-foreground">Explain Topic</h2>
            </div>
            <p className="text-muted-foreground text-sm font-mono leading-relaxed mb-6">
              Get a comprehensive, structured explanation of any Data Science topic.
            </p>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Explore Topics
              <ArrowRight size={14} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center fade-in-2">
          Requires Chrome 138+ with Prompt API enabled · All processing happens on-device · No data leaves your browser
        </p>
      </div>
    </div>
  );
}