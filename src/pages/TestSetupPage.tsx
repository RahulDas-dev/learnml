import { useState, useRef, useEffect } from 'react';
import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIStatusBanner } from '@/components/AIStatusBanner';
import { PageHeader } from '@/components/PageHeader';
import { EXPERIENCE_LEVELS, LEVEL_CONFIG } from '@/lib/config';
import { PlannerAgent } from '@/agents';
import type { AIStatus } from '@/agents';
import {
  ArrowRight,
  AlertCircle,
  LoaderCircle,
  Sprout,
  Flame,
  Rocket,
  Crown,
} from 'lucide-react';

const LEVEL_ICONS = { Sprout, Flame, Rocket, Crown } as Record<string, ElementType>;
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TestSetupPage() {
  const navigate = useNavigate();

  const [stage, setStage] = useState<'setup' | 'validating'>('setup');
  const [topicInput, setTopicInput] = useState('');
  const [topicError, setTopicError] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('intermediate');

  const [aiStatus, setAiStatus] = useState<AIStatus>('checking');
  const [aiMessage, setAiMessage] = useState<string | undefined>();
  const [downloadProgress, setDownloadProgress] = useState<number | null | undefined>();

  const agentRef = useRef<PlannerAgent | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const agent = new PlannerAgent();
    agentRef.current = agent;

    agent.init({
      onDownloadProgress: (pct) => {
        setAiStatus('downloading');
        setDownloadProgress(pct);
      },
    }).then((result) => {
      setAiStatus(result.status);
      setAiMessage(result.message);
      setDownloadProgress(undefined);
    });

    return () => { agent.destroy(); };
  }, []);

  const handleStartTest = async () => {
    const topic = topicInput.trim();
    if (!topic) { setTopicError('Please enter a topic to test on.'); return; }
    if (!agentRef.current?.isReady) return;

    setTopicError('');
    setStage('validating');

    try {
      abortRef.current = new AbortController();
      const result = await agentRef.current.validateTopic(topic, abortRef.current.signal);

      if (!result.isValidTopic) {
        setTopicError(result.validationError ?? `"${topic}" doesn't appear to be a Data Science related topic. Try topics like Machine Learning, Statistics, Deep Learning, NLP, etc.`);
        setStage('setup');
        return;
      }

      const id = crypto.randomUUID();
      sessionStorage.setItem(`ds_mocktest_setup_${id}`, JSON.stringify({
        topic: result.topic || topic,          // use the canonical rephrasing
        level: selectedLevel,
        overlappedTopic: result.overlappedTopic,
        validationTokens: agentRef.current?.lastTokens ?? 0,
      }));
      navigate(`/mock-test/${id}/generating`);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') { setStage('setup'); return; }
      setTopicError(`Validation failed: ${(err as Error).message}`);
      setStage('setup');
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Mock Test">
        <span className="text-xs text-muted-foreground mono">configure &amp; start</span>
      </PageHeader>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-1">Configure Your Test</h1>
          <p className="text-muted-foreground text-sm">Enter any Data Science topic and choose your experience level</p>
        </div>

        <AIStatusBanner status={aiStatus} downloadProgress={downloadProgress} message={aiMessage} />

        {/* Topic Input */}
        <div className="mb-8 fade-in-1">
          <label className="text-xs mono text-muted-foreground uppercase tracking-widest block mb-4">Topic</label>
          <div className="relative">
            <Input
              type="text"
              value={topicInput}
              onChange={(e) => { setTopicInput(e.target.value); setTopicError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && aiStatus === 'ready' && stage !== 'validating' && handleStartTest()}
              placeholder="e.g. Random Forests, Attention Mechanism, Gradient Boosting, Bayesian Statistics..."
              className={`h-14 text-base ${topicError ? 'border-red-300' : ''}`}
              disabled={stage === 'validating'}
            />
            {stage === 'validating' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <LoaderCircle size={15} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          {topicError && (
            <div className="mt-3 flex items-start gap-2">
              <AlertCircle size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{topicError}</p>
            </div>
          )}
          {stage === 'validating' && (
            <p className="mt-3 text-xs text-muted-foreground mono animate-pulse">Validating topic…</p>
          )}
        </div>

        {/* Level Selector */}
        <div className="mb-10 fade-in-2">
          <label className="text-xs mono text-muted-foreground uppercase tracking-widest block mb-4">Experience Level</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EXPERIENCE_LEVELS.map((lvl) => {
              const config = LEVEL_CONFIG[lvl.id];
              return (
                <Card
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`p-5 text-left cursor-pointer transition-all duration-200 shadow-none ${
                    selectedLevel === lvl.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground hover:border-foreground/30 hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {(() => { const Icon = LEVEL_ICONS[lvl.icon]; return Icon ? <Icon size={16} className="opacity-80 flex-shrink-0" /> : null; })()}
                    <p className="font-bold text-sm">{lvl.label}</p>
                  </div>
                  <ul className={`text-xs leading-snug mb-1 list-disc pl-4 space-y-0.5 ${selectedLevel === lvl.id ? 'text-background/60' : 'text-muted-foreground'}`}>
                    {lvl.description.split(' — ').map((part, i) => (
                      <li key={i}>{part}</li>
                    ))}
                  </ul>
                  <br />
                  {config && (
                    <p className={`text-[10px] mono text-right ${selectedLevel === lvl.id ? 'text-background/50' : 'text-muted-foreground/70'}`}>
                      {config.total} Qs · {config.durationLabel}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleStartTest}
          disabled={aiStatus !== 'ready' || stage === 'validating' || !topicInput.trim()}
          className="w-full py-3.5 text-sm"
          style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '0.01em' }}
        >
          {stage === 'validating' ? (
            <><LoaderCircle size={15} className="animate-spin" /> Validating Topic…</>
          ) : aiStatus !== 'ready' ? (
            <><LoaderCircle size={15} className="animate-spin" /> Waiting for LLM…</>
          ) : (
            <>Proceed <ArrowRight size={15} /></>
          )}
        </Button>
      </div>
    </div>
  );
}