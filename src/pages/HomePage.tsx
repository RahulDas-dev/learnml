import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AIStatusBanner } from '@/components/AIStatusBanner';
import { useAICapability } from '@/hooks/useAICapability';
import { FlaskConical, BookOpen, ArrowRight, Sigma, ShieldCheck, Zap, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-11 h-11 rounded-xl border border-border bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-foreground group-hover:border-foreground transition-all duration-200">
      {children}
    </div>
  );
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Private by design',
    body: 'Every mock test and explanation is generated on-device by Gemini Nano. No servers, no API keys, no data ever leaves your browser.',
  },
  {
    icon: Layers,
    title: 'Four question types',
    body: 'Conceptual, math (with LaTeX), programming (with code), and case-study questions — across beginner to expert levels.',
  },
  {
    icon: Zap,
    title: 'Free & unlimited',
    body: 'Generate as many Data Science and Machine Learning tests as you want. No signup, no cost, fresh questions every time.',
  },
];

const FAQS = [
  {
    q: 'Is DS Learn free?',
    a: 'Yes — completely free with no signup. The AI runs on your device, so there are no servers, API keys, or usage costs.',
  },
  {
    q: 'What do I need to run it?',
    a: 'Google Chrome 138 or newer with the built-in Prompt API for Gemini Nano enabled (chrome://flags/#prompt-api-for-gemini-nano). All generation happens on-device.',
  },
  {
    q: 'Does my data leave the browser?',
    a: 'No. Every mock test and explanation is generated locally by Gemini Nano. Nothing is sent to any server.',
  },
  {
    q: 'Which topics can I practice?',
    a: 'Any Data Science topic — Machine Learning, Deep Learning, Statistics, NLP, Computer Vision, MLOps, Generative AI, LLMs, and more.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const capability = useAICapability();

  return (
    <div className="min-h-screen relative">
      {/* Navbar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <nav className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-base text-foreground tracking-tight flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            <Sigma size={20} strokeWidth={2} aria-hidden="true" />
            DS Learn
          </span>
          <ThemeToggle />
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Capability red-flag — shown immediately on unsupported browsers */}
        {capability === 'unsupported' && (
          <AIStatusBanner
            status="unsupported"
            message="DS Learn needs Google Chrome 138+ with the Prompt API (Gemini Nano) enabled. Turn it on at chrome://flags/#prompt-api-for-gemini-nano, then reload this page."
          />
        )}

        {/* Hero */}
        <section className="mb-16 fade-in">
          <Badge variant="outline" className="gap-2 px-3 py-1 rounded-full bg-secondary mb-6 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
            <span className="text-xs mono text-muted-foreground tracking-wide">Powered by Chrome Built-in AI</span>
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-5 leading-tight tracking-tight">
            Master<br />Data Science
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Free, on-device AI <strong className="text-foreground font-semibold">mock tests</strong> and in-depth{' '}
            <strong className="text-foreground font-semibold">topic explanations</strong> for Data Science &amp; Machine
            Learning — generated privately in your browser via Gemini Nano.
          </p>
        </section>

        {/* CTA Cards */}
        <section className="grid sm:grid-cols-2 gap-5 mb-20 fade-in-1" aria-label="Get started">
          {/* Mock Test */}
          <Card
            onClick={() => navigate('/mock-test')}
            className="group cursor-pointer hover:-translate-y-0.5 p-8 text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <IconBox>
                <FlaskConical size={20} strokeWidth={1.5} className="text-foreground group-hover:text-background transition-colors duration-200" aria-hidden="true" />
              </IconBox>
              <h2 className="text-xl font-bold text-foreground">Mock Test</h2>
            </div>
            <p className="text-muted-foreground text-sm font-mono leading-relaxed mb-6">
              Type any Data Science topic, choose your experience level — AI generates a fresh test every time.
            </p>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Start Test
              <ArrowRight size={14} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </div>
          </Card>

          {/* Explain Topic — coming soon (disabled) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                aria-disabled="true"
                className="relative p-8 text-left opacity-60 cursor-not-allowed"
              >
                <span className="absolute top-3 right-3 inline-flex items-center leading-none text-[10px] mono uppercase tracking-wide text-muted-foreground border border-border rounded-full px-2.5 py-1">
                  Coming soon
                </span>
                <div className="flex items-center gap-3 mb-2">
                  <IconBox>
                    <BookOpen size={20} strokeWidth={1.5} className="text-foreground" aria-hidden="true" />
                  </IconBox>
                  <h2 className="text-xl font-bold text-foreground">Explain Topic</h2>
                </div>
                <p className="text-muted-foreground text-sm font-mono leading-relaxed mb-6">
                  Get a comprehensive, structured explanation of any Data Science topic.
                </p>
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  Coming soon
                </div>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Coming Soon — under construction</TooltipContent>
          </Tooltip>
        </section>

        {/* Features */}
        <section className="mb-20 fade-in-2" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl font-bold text-foreground mb-6 tracking-tight">
            Why DS Learn
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <Icon size={18} strokeWidth={1.75} className="text-foreground mb-3" aria-hidden="true" />
                <h3 className="text-sm font-bold text-foreground mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 fade-in-2" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold text-foreground mb-6 tracking-tight">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground flex items-center justify-between">
                  {q}
                  <ArrowRight size={14} className="text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                </summary>
                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Footer note */}
      <footer className="max-w-4xl mx-auto px-6 pb-10">
        <p className="text-xs text-muted-foreground text-center fade-in-2">
          Requires Chrome 138+ with Prompt API enabled · All processing happens on-device · No data leaves your browser
        </p>
      </footer>
    </div>
  );
}
