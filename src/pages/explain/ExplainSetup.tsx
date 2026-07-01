import { AIStatusBanner } from '@/components/AIStatusBanner';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, LoaderCircle, AlertCircle } from 'lucide-react';
import { useExplain } from '@/hooks/useExplain';

const SUGGESTIONS = [
  'Random Forests', 'Transformer Architecture', 'Gradient Descent',
  'Attention Mechanism', 'Bayesian Statistics', 'Feature Engineering',
  'K-Means Clustering', 'Backpropagation', 'RAG', 'LSTM Networks',
];

export function ExplainSetup() {
  const {
    topicInput,
    setTopicInput,
    topicError,
    setTopicError,
    error,
    aiStatus,
    aiMessage,
    downloadProgress,
    onStart,
  } = useExplain();

  return (
    <div className="min-h-screen">
      <PageHeader title="Explain Topic" />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-1">What do you want to learn?</h1>
          <p className="text-muted-foreground text-sm">Type any Data Science topic — AI will create a slide deck to teach you</p>
        </div>

        <AIStatusBanner status={aiStatus} downloadProgress={downloadProgress} message={aiMessage} />

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle size={15} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="p-7 mb-6 fade-in-1">
          <label className="text-xs mono text-muted-foreground uppercase tracking-widest block mb-4">Topic</label>
          <Input
            type="text"
            value={topicInput}
            onChange={(e) => { setTopicInput(e.target.value); setTopicError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && aiStatus === 'ready' && onStart()}
            placeholder="e.g. Attention Mechanism, Gradient Descent, LSTM..."
            className={topicError ? 'border-muted-foreground shadow-[0_0_0_3px_hsl(var(--muted-foreground)/0.12)]' : ''}
            autoFocus
          />
          {topicError && (
            <div className="mt-3 flex items-start gap-2">
              <AlertCircle size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{topicError}</p>
            </div>
          )}
          <div className="mt-5">
            <p className="text-xs text-muted-foreground mb-3">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  onClick={() => { setTopicInput(s); setTopicError(''); }}
                  className={`mono text-[0.68rem] cursor-pointer hover:bg-accent transition-all ${
                    topicInput === s ? 'bg-foreground text-background border-foreground' : ''
                  }`}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <Button
          onClick={onStart}
          disabled={aiStatus !== 'ready' || !topicInput.trim()}
          className="w-full py-3.5 text-sm"
        >
          {aiStatus === 'ready' ? (
            <>Start Learning {topicInput.trim() || 'Topic'} <ArrowRight size={15} /></>
          ) : (
            <><LoaderCircle size={15} className="animate-spin" /> Waiting for LLM…</>
          )}
        </Button>
      </div>
    </div>
  );
}