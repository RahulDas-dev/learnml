import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MathText } from '@/components/MathText';
import type { AnswerValue } from '@/context/MockTestContext';
import { useMockTest } from '@/hooks/useMockTest';
import { renderSlideMarkdown } from '@/lib/markdownRenderer';
import {
  RotateCcw,
  BookOpen,
  Download,
  Clock,
  MonitorOff,
  Check,
  X,
  Minus,
  MessageSquareDot,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Home,
  Share2,
} from 'lucide-react';

const SITE_URL = 'https://rahuldas-dev.github.io/learnml/';

function isCorrectAnswer(answer: AnswerValue, correct: number | number[]): boolean {
  if (answer === null) return false;
  if (Array.isArray(correct)) {
    if (!Array.isArray(answer)) return false;
    return correct.length === answer.length && correct.every(c => answer.includes(c));
  }
  return answer === correct;
}

export function TestResults() {
  const navigate = useNavigate();
  const {
    questions,
    answers,
    topic,
    level,
    explainIdx,
    setExplainIdx,
    explanation,
    explanationLoading,
    explanationError,
    onTryAgain,
    onExplainTopic,
    getExplanations,
    questionTimings,
    tabChangeCount,
    elapsedTime,
    testDuration,
    formatTime,
  } = useMockTest();

  const handleDownload = () => {
    const explanations = getExplanations();
    const lines: string[] = [
      `# ${topic} — ${level}`,
      ``,
      `**Score: ${Math.round((questions.reduce((acc, q, i) => acc + (isCorrectAnswer(answers[i], q.correct) ? 1 : 0), 0) / questions.length) * 100)}% · ${questions.reduce((acc, q, i) => acc + (isCorrectAnswer(answers[i], q.correct) ? 1 : 0), 0)}/${questions.length} correct**`,
      ``,
      `---`,
      ``,
    ];
    questions.forEach((q, i) => {
      lines.push(`## Q${i + 1}. ${q.question}`);
      lines.push(``);
      const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
      q.options.forEach((opt, idx) => {
        lines.push(`- ${String.fromCharCode(65 + idx)}) ${opt.content}${correctArr.includes(idx) ? ' ✓' : ''}`);
      });
      lines.push(``);
      const exp = explanations[i];
      if (exp) { lines.push(`**Explanation:**`); lines.push(``); lines.push(exp); lines.push(``); }
      lines.push(`---`); lines.push(``);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '_')}_${level}_results.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const score = questions.reduce((acc, q, i) => acc + (isCorrectAnswer(answers[i], q.correct) ? 1 : 0), 0);
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const incorrect = questions.length - score - answers.filter((a) => a === null).length;
  const skipped = answers.filter((a) => a === null).length;
  const completedBeforeTime = elapsedTime > 0 && elapsedTime < testDuration;

  const handleShare = async () => {
    const text = `I scored ${pct}% on a ${level} "${topic}" mock test on DS Learn — free on-device AI Data Science practice.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'DS Learn', text, url: SITE_URL });
        return;
      } catch { /* user cancelled — fall through to X intent */ }
    }
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${SITE_URL}`)}`;
    window.open(intent, '_blank', 'noopener,noreferrer');
  };

  const circumference = 2 * Math.PI * 52;
  const total = questions.length;
  const correctArc   = total > 0 ? (score     / total) * circumference : 0;
  const incorrectArc = total > 0 ? (incorrect / total) * circumference : 0;
  const skippedArc   = total > 0 ? (skipped   / total) * circumference : 0;

  // ── Full-page explanation view ─────────────────────────────────────────────
  if (explainIdx !== null && questions[explainIdx]) {
    const q = questions[explainIdx];
    const userAnswer = answers[explainIdx];
    const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
    const userArr = userAnswer === null
      ? []
      : Array.isArray(userAnswer)
      ? (userAnswer as number[])
      : [userAnswer as number];
    const isDone = !explanationLoading && !explanationError && explanation.length > 0;

    return (
      <div className="min-h-screen">
        <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setExplainIdx(null)} className="h-8 w-8">
              <ArrowLeft size={15} />
            </Button>
            <span className="font-semibold text-sm text-foreground flex-1">
              Q{explainIdx + 1} <span className="font-normal text-muted-foreground">of {questions.length}</span>
            </span>
            <Badge variant="secondary" className="font-normal text-[10px] mono">
              {q.answerMode === 'multiple' ? 'Multi-select' : 'Single select'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Home" aria-label="Home" className="h-8 w-8">
              <Home size={15} />
            </Button>
            <ThemeToggle />
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-8 fade-in">
          {/* Question text */}
          <p className="text-base font-semibold text-foreground leading-relaxed mb-2">
            <MathText text={q.question} />
          </p>

          {/* Code block if present */}
          {q.code && (
            <pre className="text-sm mono text-foreground bg-secondary rounded-xl p-4 overflow-x-auto whitespace-pre mb-4">{q.code}</pre>
          )}

          {/* Options — plain list with icons */}
          <div className="mb-6 space-y-1.5">
            {q.options.map((opt, idx) => {
              const isCorrectOpt = (correctArr as number[]).includes(idx);
              const isWrongPick = userArr.includes(idx) && !isCorrectOpt;
              return (
                <div key={idx} className="flex items-start gap-2.5 py-1">
                  <span className={`text-xs mono w-5 flex-shrink-0 mt-0.5 font-medium ${
                    isCorrectOpt ? 'text-green-600 dark:text-green-400' :
                    isWrongPick ? 'text-red-500' :
                    'text-muted-foreground'
                  }`}>
                    {String.fromCharCode(65 + idx)})
                  </span>
                  <span className={`text-sm flex-1 leading-relaxed ${
                    isCorrectOpt ? 'text-green-700 dark:text-green-300 font-medium' :
                    isWrongPick ? 'text-red-500 line-through' :
                    'text-muted-foreground'
                  }`}>
                    <MathText text={opt.content} />
                  </span>
                  {isCorrectOpt && <Check size={13} className="text-green-500 flex-shrink-0 mt-1" />}
                  {isWrongPick && <X size={13} className="text-red-500 flex-shrink-0 mt-1" />}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-border mb-6" />

          {/* Explanation — no card, raw text */}
          {explanationError ? (
            <p className="text-sm text-red-500 mb-6">{explanationError}</p>
          ) : explanation ? (
            <div>
              <div
                className="prose-sm text-sm text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderSlideMarkdown(explanation) }}
              />
            </div>
          ) : (
            <div className="space-y-2.5 animate-pulse mb-6">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-9/12" />
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}

          {/* Action buttons — appear when generation is done */}
          {isDone && (
            <div className="mt-8 flex flex-col gap-2.5 fade-in">
              <div className="flex gap-2.5">
                <Button
                  variant="outline" className="flex-1 text-sm"
                  disabled={explainIdx === 0}
                  onClick={() => setExplainIdx(explainIdx - 1)}
                >
                  <ChevronLeft size={14} /> Prev Question
                </Button>
                <Button
                  variant="outline" className="flex-1 text-sm"
                  disabled={explainIdx === questions.length - 1}
                  onClick={() => setExplainIdx(explainIdx + 1)}
                >
                  Next Question <ChevronRight size={14} />
                </Button>
              </div>
              <div className="flex gap-2.5">
                <Button variant="outline" className="flex-1 text-sm" onClick={() => setExplainIdx(null)}>
                  Results
                </Button>
                <Button className="flex-1 text-sm" onClick={onTryAgain}>
                  <RotateCcw size={14} /> Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Results summary page ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>Results</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Home" aria-label="Home">
              <Home size={16} strokeWidth={1.75} />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Hero card ── */}
        <div className="mb-6 fade-in rounded-2xl bg-card shadow-sm" style={{ overflow: 'visible' }}>

          {/* Donut score ring */}
          <div className="rounded-t-2xl flex items-center justify-center pt-10 pb-6">
            <div className="relative" style={{ width: 210, height: 210 }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[132px] h-[132px] rounded-full bg-card/85 backdrop-blur-sm" />
              </div>
              <svg width="210" height="210" viewBox="0 0 128 128" className="-rotate-90 absolute inset-0">
                <circle cx="64" cy="64" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="11" />
                {skipped > 0 && (
                  <circle cx="64" cy="64" r="52" fill="none" stroke="#cbd5e1" strokeWidth="11"
                    strokeDasharray={`${skippedArc} ${circumference}`}
                    strokeDashoffset={circumference - (correctArc + incorrectArc)} />
                )}
                {incorrect > 0 && (
                  <circle cx="64" cy="64" r="52" fill="none" stroke="#64748b" strokeWidth="11"
                    strokeDasharray={`${incorrectArc} ${circumference}`}
                    strokeDashoffset={circumference - correctArc} />
                )}
                {score > 0 && (
                  <circle cx="64" cy="64" r="52" fill="none" stroke="hsl(var(--foreground))" strokeWidth="11"
                    strokeDasharray={`${correctArc} ${circumference}`}
                    strokeDashoffset={circumference}
                    className="score-ring" />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground leading-none" style={{ fontFamily: 'Syne, sans-serif' }}>{pct}%</span>
                <span className="text-[10px] text-muted-foreground mono mt-1 max-w-[90px] text-center truncate">{topic}</span>
                <span className="text-[9px] text-muted-foreground/60 capitalize mt-0.5">{level}</span>
              </div>
            </div>
          </div>

          {/* Per-question squares — hover for time spent, click to open explanation */}
          <div className="px-6 pb-5">
            <p className="text-[10px] mono text-muted-foreground/70 text-center mb-2.5">Tap a question for its explanation</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {questions.map((q, i) => {
                const secs = questionTimings[i] ?? 0;
                const isSkipped = answers[i] === null;
                const correct = isCorrectAnswer(answers[i], q.correct);
                return (
                  <button
                    key={i}
                    onClick={() => setExplainIdx(i)}
                    className={`group/sq relative w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold mono cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 ${
                      isSkipped
                        ? 'bg-secondary text-muted-foreground border border-border'
                        : correct
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground border border-border'
                    }`}
                  >
                    {i + 1}
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/sq:opacity-100 transition-opacity duration-100 pointer-events-none z-50">
                      <div className="bg-foreground text-background text-[9px] font-medium px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1 shadow-lg">
                        <MessageSquareDot size={8} /> Q{i + 1} · {secs}s
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Badges strip */}
          <div className="flex flex-wrap justify-center gap-2 px-6 py-3.5 bg-muted/20">
            <Badge variant="secondary" className="gap-1 font-normal"><Check size={11} /> {score} Correct</Badge>
            <Badge variant="secondary" className="gap-1 font-normal"><X size={11} /> {incorrect} Incorrect</Badge>
            <Badge variant="secondary" className="gap-1 font-normal"><Minus size={11} /> {skipped} Skipped</Badge>
            {completedBeforeTime && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Clock size={11} /> {formatTime(elapsedTime)} · Finished early
              </Badge>
            )}
            {tabChangeCount > 0 && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <MonitorOff size={11} /> {tabChangeCount} tab {tabChangeCount === 1 ? 'switch' : 'switches'}
              </Badge>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-in-2">
          <Button variant="outline" onClick={onTryAgain} className="py-3 text-sm">
            <RotateCcw size={14} /> Try Again
          </Button>
          <Button variant="outline" onClick={handleShare} className="py-3 text-sm">
            <Share2 size={14} /> Share
          </Button>
          <Button variant="outline" onClick={handleDownload} className="py-3 text-sm">
            <Download size={14} /> Download
          </Button>
          <Button onClick={onExplainTopic} className="py-3 text-sm">
            <BookOpen size={14} /> Explain Topic
          </Button>
        </div>
      </div>
    </div>
  );
}