import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { LEVEL_CONFIG } from '@/lib/config';
import type { MCQQuestion } from '@/lib/config';
import { QuestionGeneratorAgent, ExplainerAgent } from '@/agents';
import type { AIStatus } from '@/agents';

export type AnswerValue = number | number[] | null;

// ── Session persistence ────────────────────────────────────────────────────

const setupKey = (id: string) => `ds_mocktest_setup_${id}`;
const stateKey = (id: string) => `ds_mocktest_state_${id}`;

interface SetupData { topic: string; level: string; }

interface SavedState {
  questions: MCQQuestion[];
  answers: AnswerValue[];
  seen: boolean[];
  currentQ: number;
}

function loadSetup(id: string): SetupData | null {
  try {
    const raw = sessionStorage.getItem(setupKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadSavedState(id: string): SavedState | null {
  try {
    const raw = sessionStorage.getItem(stateKey(id));
    if (!raw) return null;
    const d: SavedState = JSON.parse(raw);
    if (!Array.isArray(d.questions) || d.questions.length === 0) return null;
    return d;
  } catch { return null; }
}

function persistState(id: string, data: SavedState) {
  try { sessionStorage.setItem(stateKey(id), JSON.stringify(data)); } catch { /* storage unavailable */ }
}

function clearSession(id: string) {
  sessionStorage.removeItem(setupKey(id));
  sessionStorage.removeItem(stateKey(id));
}

// ── Context ───────────────────────────────────────────────────────────────

export interface MockTestContextValue {
  topic: string;
  level: string;
  totalQuestions: number;
  testDuration: number;
  rawStream: string;
  questions: MCQQuestion[];
  currentQ: number;
  answers: AnswerValue[];
  seen: boolean[];
  timeLeft: number;
  questionTimings: number[];
  tabChangeCount: number;
  elapsedTime: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  explainIdx: number | null;
  setExplainIdx: (idx: number | null) => void;
  explanation: string;
  explanationLoading: boolean;
  explanationError: string | null;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  selectAnswer: (optionIdx: number) => void;
  goToQuestion: (idx: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  formatTime: (s: number) => string;
  onCancel: () => void;
  onTryAgain: () => void;
  onExplainTopic: () => void;
  getExplanations: () => Record<number, string>;
}

export const MockTestContext = createContext<MockTestContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

export function MockTestProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const location = useLocation();

  const setup = id ? loadSetup(id) : null;
  const topic = setup?.topic ?? '';
  const level = setup?.level ?? '';

  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.intermediate;
  const totalQuestions = config.total;
  const testDuration = config.duration;

  // Derive current stage from URL — avoids duplicate state
  const onQuiz = location.pathname.endsWith('/quiz');

  useEffect(() => {
    if (!id || !topic || !level) navigate('/mock-test', { replace: true });
  }, [id, topic, level, navigate]);

  const [restored] = useState<SavedState | null>(() =>
    id ? loadSavedState(id) : null
  );

  const [aiStatus, setAiStatus] = useState<AIStatus>('checking');

  const qGenRef = useRef<QuestionGeneratorAgent | null>(null);
  const explainerRef = useRef<ExplainerAgent | null>(null);

  useEffect(() => {
    let cancelled = false;

    const qGen = new QuestionGeneratorAgent();
    const explainer = new ExplainerAgent();
    qGenRef.current = qGen;
    explainerRef.current = explainer;

    Promise.all([
      qGen.init({ temperature: 1.5, topK: 40 }),
      explainer.init({ temperature: 0.8, topK: 40 }),
    ]).then(() => {
      if (!cancelled && qGen.isReady && explainer.isReady) setAiStatus('ready');
    });

    return () => {
      cancelled = true;
      qGen.destroy();
      explainer.destroy();
      setAiStatus('checking');
    };
  }, []);

  const [rawStream, setRawStream] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>(restored?.questions ?? []);
  const [currentQ, setCurrentQ] = useState(restored?.currentQ ?? 0);
  const [answers, setAnswers] = useState<AnswerValue[]>(restored?.answers ?? []);
  const [seen, setSeen] = useState<boolean[]>(restored?.seen ?? []);
  const [timeLeft, setTimeLeft] = useState(testDuration);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const explainParam = searchParams.get('explain');
  const explainIdx = explainParam ? parseInt(explainParam.replace(/^Q/, ''), 10) - 1 : null;
  const setExplainIdx = (idx: number | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (idx === null) next.delete('explain');
      else next.set('explain', `Q${idx + 1}`);
      return next;
    }, { replace: true });
  };

  const [explanation, setExplanation] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const explanationCache = useRef<Record<number, string>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationStarted = useRef(restored !== null);
  const questionStartRef = useRef<number>(Date.now());

  const [questionTimings, setQuestionTimings] = useState<number[]>([]);
  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const submitTest = useCallback(() => {
    const spent = Math.round((Date.now() - questionStartRef.current) / 1000);
    setQuestionTimings((prev) => {
      const next = [...prev];
      next[currentQ] = (next[currentQ] ?? 0) + spent;
      return next;
    });
    setElapsedTime(testDuration - timeLeft);
    if (timerRef.current) clearInterval(timerRef.current);
    navigate(`/mock-test/${id}/results`, { replace: true });
  }, [currentQ, testDuration, timeLeft, navigate, id]);

  // Auto-save whenever test state changes
  useEffect(() => {
    if (!id || questions.length === 0) return;
    persistState(id, { questions, answers, seen, currentQ });
  }, [questions, answers, seen, currentQ, id]);

  // Start generation once AI is ready (skipped if restored from session)
  useEffect(() => {
    if (!topic || !level || aiStatus !== 'ready' || generationStarted.current) return;
    generationStarted.current = true;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const signal = ctrl.signal;

    const run = async () => {
      try {
        const generated = await qGenRef.current!.generateQuestions(
          topic, level, [],
          (_n, text) => { setRawStream(text); },
          signal
        );

        if (!generated || generated.length === 0) {
          navigate('/mock-test', { replace: true });
          return;
        }

        setQuestions(generated);
        setAnswers(Array(generated.length).fill(null));
        setSeen(() => {
          const s = Array(generated.length).fill(false);
          s[0] = true;
          return s;
        });
        setCurrentQ(0);
        setTimeLeft(testDuration);
        questionStartRef.current = Date.now();
        navigate(`/mock-test/${id}/quiz`, { replace: true });
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          navigate('/mock-test', { replace: true });
        }
      }
    };

    run();

    return () => {
      ctrl.abort();
      generationStarted.current = false;
    };
  }, [aiStatus, topic, level, navigate, testDuration, id]);

  // Timer — active only on quiz route
  useEffect(() => {
    if (!onQuiz || questions.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); submitTest(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [onQuiz, questions.length, submitTest]);

  // Tab-change tracking — active only on quiz route
  const tabChangeRef = useRef(0);
  useEffect(() => {
    if (!onQuiz) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        tabChangeRef.current += 1;
        setTabChangeCount(tabChangeRef.current);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [onQuiz]);

  // Per-question explanation
  useEffect(() => {
    if (explainIdx === null || !questions[explainIdx]) return;

    // Reset state for this question
    setExplanationError(null);
    setExpanded(false);

    // Serve from cache immediately
    if (explanationCache.current[explainIdx]) {
      setExplanationLoading(false);
      setExplanation(explanationCache.current[explainIdx]);
      return;
    }

    // Agent not ready — show error rather than silently doing nothing
    if (!explainerRef.current?.isReady) {
      setExplanationLoading(false);
      setExplanation('');
      setExplanationError('AI not ready — please wait a moment then try again.');
      return;
    }

    setExplanationLoading(true);
    setExplanation('');

    const abort = new AbortController();
    const idx = explainIdx;

    explainerRef.current.explainQuestion(
      questions[idx],
      answers[idx],
      (text) => setExplanation(text),
      abort.signal
    ).then((final) => {
      explanationCache.current[idx] = final;
      setExplanationLoading(false);
    }).catch((err: unknown) => {
      if ((err as Error).name === 'AbortError') return; // navigation away — expected
      setExplanationLoading(false);
      setExplanationError((err instanceof Error) ? err.message : 'Failed to generate explanation.');
    });

    return () => abort.abort();
  }, [explainIdx, questions, answers]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const selectAnswer = (optionIdx: number) => {
    const q = questions[currentQ];
    const newAnswers = [...answers];

    if (q.answerMode === 'multiple') {
      const current = (newAnswers[currentQ] as number[] | null) ?? [];
      const itemIdx = current.indexOf(optionIdx);
      if (itemIdx >= 0) {
        const updated = current.filter(i => i !== optionIdx);
        newAnswers[currentQ] = updated.length === 0 ? null : updated;
      } else {
        newAnswers[currentQ] = [...current, optionIdx].sort();
      }
    } else {
      newAnswers[currentQ] = optionIdx;
    }

    setAnswers(newAnswers);
  };

  const goToQuestion = (idx: number) => {
    const spent = Math.round((Date.now() - questionStartRef.current) / 1000);
    setQuestionTimings((prev) => {
      const next = [...prev];
      next[currentQ] = (next[currentQ] ?? 0) + spent;
      return next;
    });
    questionStartRef.current = Date.now();
    setCurrentQ(idx);
    setSeen((prev) => { const next = [...prev]; next[idx] = true; return next; });
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) goToQuestion(currentQ + 1);
    else submitTest();
  };

  const prevQuestion = () => {
    if (currentQ > 0) goToQuestion(currentQ - 1);
  };

  if (!id || !topic || !level) return null;

  const value: MockTestContextValue = {
    topic,
    level,
    totalQuestions,
    testDuration,
    rawStream,
    questions,
    currentQ,
    answers,
    seen,
    timeLeft,
    questionTimings,
    tabChangeCount,
    elapsedTime,
    sidebarOpen,
    setSidebarOpen,
    explainIdx,
    setExplainIdx,
    explanation,
    explanationLoading,
    explanationError,
    expanded,
    setExpanded,
    selectAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    formatTime,
    onCancel: () => { abortRef.current?.abort(); navigate('/mock-test'); },
    onTryAgain: () => { clearSession(id); navigate('/mock-test'); },
    onExplainTopic: () => { clearSession(id); navigate('/explain'); },
    getExplanations: () => ({ ...explanationCache.current }),
  };

  return (
    <MockTestContext.Provider value={value}>
      {children}
    </MockTestContext.Provider>
  );
}