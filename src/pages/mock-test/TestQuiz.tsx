import { ThemeToggle } from '@/components/ThemeToggle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MathText } from '@/components/MathText';
import type { AnswerValue } from '@/context/MockTestContext';
import { useMockTest } from '@/hooks/useMockTest';
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  BookOpen,
  Code,
  FileText,
  Hash,
  CheckSquare,
  CircleDot,
} from 'lucide-react';

const QUESTION_TYPE_LABELS: Record<string, { label: string; icon: typeof CircleDot }> = {
  conceptual: { label: 'Conceptual', icon: CircleDot },
  math: { label: 'Math', icon: Hash },
  programming: { label: 'Programming', icon: Code },
  'case-study': { label: 'Case Study', icon: FileText },
};

function isSelected(answer: AnswerValue, idx: number): boolean {
  if (answer === null) return false;
  if (Array.isArray(answer)) return answer.includes(idx);
  return answer === idx;
}

export function TestQuiz() {
  const {
    questions,
    currentQ,
    answers,
    seen,
    timeLeft,
    sidebarOpen,
    setSidebarOpen,
    topic,
    level,
    selectAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    formatTime,
  } = useMockTest();

  const q = questions[currentQ];
  const userAnswer = answers[currentQ];
  const progressPct = ((currentQ + 1) / questions.length) * 100;
  const isLowTime = timeLeft < 120;
  const answeredCount = answers.filter((a) => a !== null).length;

  const getStatus = (i: number): 'attempted' | 'seen' | 'unseen' => {
    if (answers[i] !== null) return 'attempted';
    if (seen[i]) return 'seen';
    return 'unseen';
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-background border-r border-border transform transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:flex-shrink-0`}>
        {/* Legend at top */}
        <div className="px-4 h-14 flex items-center border-b border-border">
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500" /> Attempted</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Seen</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" /> Not visited</span>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-56px)]">
          <div className="p-3 space-y-1">
          {questions.map((_, i) => {
            const status = getStatus(i);
            return (
              <button
                key={i}
                onClick={() => { goToQuestion(i); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  i === currentQ
                    ? 'bg-secondary ring-2 ring-foreground'
                    : 'hover:bg-secondary'
                }`}
              >
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold mono flex-shrink-0 ${
                  status === 'attempted'
                    ? 'bg-green-500 text-white'
                    : status === 'seen'
                    ? 'bg-amber-400 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {i + 1}
                </span>
                <span className={`text-xs ${i === currentQ ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {status === 'attempted' ? 'Attempted' : status === 'seen' ? 'Seen' : 'Not visited'}
                </span>
              </button>
            );
          })}
          </div>
        </ScrollArea>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <nav className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                <BookOpen size={16} />
              </Button>
              <span className="font-bold text-sm text-foreground truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
                {topic}
              </span>
              <span className="text-xs mono text-muted-foreground capitalize hidden sm:inline">{level}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold mono text-sm ${
                isLowTime
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-secondary text-foreground'
              }`}>
                <Timer size={13} />
                {formatTime(timeLeft)}
              </div>
              <ThemeToggle />
            </div>
          </div>
          {/* Progress */}
          <Progress value={progressPct} />
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Question number + type badge */}
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs mono text-muted-foreground">
              Question {currentQ + 1} of {questions.length}
            </p>
            {(() => {
              const typeInfo = QUESTION_TYPE_LABELS[q.questionType];
              if (typeInfo) {
                const Icon = typeInfo.icon;
                return (
                  <Badge variant="secondary" className="text-[10px] mono gap-1 rounded-full">
                    <Icon size={10} /> {typeInfo.label}
                  </Badge>
                );
              }
              return null;
            })()}
            {q.answerMode === 'multiple' && (
              <Badge variant="outline" className="text-[10px] mono gap-1 rounded-full">
                <CheckSquare size={10} /> Multiple
              </Badge>
            )}
          </div>

          {/* Question + Context */}
          {q.context ? (
            <Card className="p-7 mb-4 fade-in border-l-4 border-foreground/20 select-none">
              <p className="text-xs mono text-muted-foreground uppercase tracking-widest mb-3">Scenario</p>
              <p className="text-sm text-foreground leading-relaxed mb-4">{q.context}</p>
              <p className="text-base font-semibold text-foreground leading-relaxed border-t border-border pt-4">
                <MathText text={q.question} />
              </p>
            </Card>
          ) : (
            <Card className="p-7 mb-4 fade-in select-none">
              <p className="text-base font-semibold text-foreground leading-relaxed">
                <MathText text={q.question} />
              </p>
              {q.answerMode === 'multiple' && (
                <p className="text-xs text-muted-foreground mt-2 mono">Select all that apply</p>
              )}
            </Card>
          )}

          {/* Code block */}
          {q.code && (
            <Card className="p-5 mb-4 fade-in">
              <p className="text-xs mono text-muted-foreground uppercase tracking-widest mb-2">Code</p>
              <pre className="text-sm mono text-foreground bg-secondary rounded-xl p-4 overflow-x-auto whitespace-pre">{q.code}</pre>
            </Card>
          )}

          {/* ASCII diagram */}
          {q.diagram && (
            <Card className="p-5 mb-4 fade-in">
              <pre className="text-xs mono text-foreground bg-secondary rounded-xl p-4 overflow-x-auto whitespace-pre leading-snug">{q.diagram}</pre>
            </Card>
          )}

          {/* Options */}
          <div className="space-y-2.5 mb-6 select-none">
            {q.options.map((opt, idx) => {
              const selected = isSelected(userAnswer, idx);
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  className={`answer-option w-full p-4 text-left flex items-center gap-4 ${
                    selected ? 'selected' : ''
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mono flex-shrink-0 border ${
                    selected
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-secondary text-muted-foreground'
                  }`}>
                    {selected && q.answerMode === 'multiple' ? '✓' : String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm text-foreground leading-relaxed flex-1">
                    <MathText text={opt.content} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevQuestion}
              disabled={currentQ === 0}
              className="px-4 py-2.5 text-sm"
            >
              <ChevronLeft size={15} /> Previous
            </Button>

            <Button
              onClick={nextQuestion}
              className="px-6 py-2.5 text-sm"
            >
              {currentQ === questions.length - 1 ? 'Finish Test' : 'Next'}
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}