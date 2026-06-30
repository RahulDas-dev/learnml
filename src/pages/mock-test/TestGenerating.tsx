import { LoaderPinwheel } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useMockTest } from '@/hooks/useMockTest';

export function TestGenerating() {
  const { topic, level, genStage, generatedCount, planTokens, genTokens, rawStream, totalQuestions, onCancel } = useMockTest();

  const planning = genStage === 'planning';
  const questionsDetected = generatedCount;
  const allDone = !planning && questionsDetected >= totalQuestions;
  const genProgress = planning ? 4 : Math.min(Math.round((questionsDetected / totalQuestions) * 100), 99);
  const fmtTokens = (n: number) => (n > 0 ? `${n.toLocaleString()} tokens` : undefined);
  const steps = [
    { label: 'Topic validated', done: true, tokens: undefined as string | undefined },
    { label: 'Planning questions', done: !planning, tokens: fmtTokens(planTokens) },
    { label: 'Generating questions', done: allDone, tokens: fmtTokens(genTokens) },
    { label: 'Finalizing test', done: allDone, tokens: undefined as string | undefined },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto px-6 fade-in">
        <Card className="overflow-hidden">

          {/* Top bar */}
          <div className="border-b border-border px-7 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center">
                <LoaderPinwheel size={14} strokeWidth={2} className="animate-spin text-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>Generating Test</p>
                <p className="text-xs text-muted-foreground mono">{topic} · {level}</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-foreground mono">{genProgress}%</span>
          </div>

          {/* Progress bar */}
          <Progress value={genProgress} className="h-1" />

          <div className="px-7 py-6 space-y-6">
            {/* Question counter */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Questions generated</p>
                <p className="text-4xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {questionsDetected}
                  <span className="text-lg text-muted-foreground font-normal"> / {totalQuestions}</span>
                </p>
              </div>
              {/* Mini dot grid */}
              <div className="grid grid-cols-5 gap-2 pb-1">
                {Array.from({ length: totalQuestions }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm transition-all duration-300 ${
                      i < questionsDetected ? 'bg-foreground' : 'bg-border'
                    }`}
                    style={{ transitionDelay: `${i * 40}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    step.done
                      ? 'bg-foreground border-foreground'
                      : i === steps.findIndex(s => !s.done)
                      ? 'border-foreground bg-transparent'
                      : 'border-border bg-transparent'
                  }`}>
                    {step.done && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="hsl(var(--background))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {!step.done && i === steps.findIndex(s => !s.done) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                    )}
                  </div>
                  <span className={`text-sm transition-colors duration-300 ${
                    step.done
                      ? 'text-foreground font-medium'
                      : i === steps.findIndex(s => !s.done)
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                  {step.tokens ? (
                    <span className="text-xs text-muted-foreground mono ml-auto tabular-nums">{step.tokens}</span>
                  ) : !step.done && i === steps.findIndex(s => !s.done) ? (
                    <span className="text-xs text-muted-foreground mono animate-pulse ml-auto">in progress…</span>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Live stream preview */}
            <div className="bg-secondary rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                <span className="text-xs mono text-muted-foreground">Streamed Token</span>
              </div>
              <div className="relative px-4 py-3 h-24 overflow-hidden">
                <pre className="text-xs text-muted-foreground mono whitespace-pre-wrap break-all leading-relaxed cursor-blink">
                  {rawStream.slice(-200) || '…'}
                </pre>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary to-transparent pointer-events-none" />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full py-3 text-sm"
            >
              Cancel generation
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}