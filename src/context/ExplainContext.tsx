import { createContext, useState, useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlannerAgent, ExplainerAgent } from '@/agents';
import type { AIStatus } from '@/agents';
import type { SlideOutline, SlideContent } from '@/lib/config';

type Stage = 'setup' | 'planning' | 'slides' | 'chat';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

// ── Context ───────────────────────────────────────────────────────────────

export interface ExplainContextValue {
  stage: 'setup' | 'planning' | 'slides' | 'chat';
  aiStatus: AIStatus;
  aiMessage: string | undefined;
  downloadProgress: number | null | undefined;
  topicInput: string;
  setTopicInput: (v: string) => void;
  topicError: string;
  setTopicError: (v: string) => void;
  error: string;
  confirmedTopic: string;
  planningProgress: string;
  outlines: SlideOutline[];
  slides: SlideContent[];
  currentSlide: number;
  isGenerating: boolean;
  streamText: string;
  chatMessages: ChatMsg[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatStreaming: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
  onStart: () => void;
  goToSlide: (idx: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  onGoHome: () => void;
  sendChat: () => void;
  onBackToSlides: () => void;
}

export const ExplainContext = createContext<ExplainContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

export function ExplainProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const plannerRef = useRef<PlannerAgent | null>(null);
  const explainerRef = useRef<ExplainerAgent | null>(null);

  const [aiStatus, setAiStatus] = useState<AIStatus>('checking');
  const [aiMessage, setAiMessage] = useState<string | undefined>();
  const [downloadProgress, setDownloadProgress] = useState<number | null | undefined>();

  useEffect(() => {
    const planner = new PlannerAgent();
    const explainer = new ExplainerAgent();
    plannerRef.current = planner;
    explainerRef.current = explainer;

    const initPlanner = planner.init({
      onDownloadProgress: (pct) => { setAiStatus('downloading'); setDownloadProgress(pct); },
    });
    const initExplainer = explainer.init();

    Promise.all([initPlanner, initExplainer]).then(([plannerResult]) => {
      setAiStatus(plannerResult.status);
      setAiMessage(plannerResult.message);
      setDownloadProgress(undefined);
    });

    return () => { planner.destroy(); explainer.destroy(); };
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const slideAbortRef = useRef<AbortController | null>(null);

  const [stage, setStage] = useState<Stage>('setup');

  // Setup
  const [topicInput, setTopicInput] = useState('');
  const [topicError, setTopicError] = useState('');
  const [error, setError] = useState('');

  // Planning
  const [confirmedTopic, setConfirmedTopic] = useState('');
  const [outlines, setOutlines] = useState<SlideOutline[]>([]);
  const [planningProgress, setPlanningProgress] = useState('');

  // Slides
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatStreaming]);

  const generateSlide = async (idx: number, outlinesArr: SlideOutline[], topic: string) => {
    if (!explainerRef.current?.isReady || idx >= outlinesArr.length) return;

    setIsGenerating(true);
    setStreamText('');
    slideAbortRef.current?.abort();
    slideAbortRef.current = new AbortController();

    try {
      const result = await explainerRef.current.generateSlide(
        topic,
        outlinesArr[idx],
        idx,
        outlinesArr.length,
        (text) => setStreamText(text),
        slideAbortRef.current.signal
      );

      setSlides((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], body: result, generated: true };
        return next;
      });
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setSlides((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], body: 'Error generating slide. Click Next to retry.', generated: true };
          return next;
        });
      }
    } finally {
      setIsGenerating(false);
      setStreamText('');
    }
  };

  const onStart = async () => {
    const topic = topicInput.trim();
    if (!topic || !plannerRef.current?.isReady) return;

    setTopicError('');
    setError('');
    setConfirmedTopic(topic);
    setStage('planning');
    setPlanningProgress('Analyzing topic complexity…');
    abortRef.current = new AbortController();

    try {
      const parsed = await plannerRef.current.plan(topic, abortRef.current.signal);

      setOutlines(parsed);
      setSlides(parsed.map((o) => ({ title: o.title, body: '', generated: false })));
      setCurrentSlide(0);
      setStage('slides');

      generateSlide(0, parsed, topic);
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError(`Planning failed: ${(err as Error).message}`);
        setStage('setup');
      }
    }
  };

  const goToSlide = (idx: number) => {
    if (idx < 0 || idx >= outlines.length) return;
    setCurrentSlide(idx);
    if (!slides[idx]?.generated) generateSlide(idx, outlines, confirmedTopic);
  };

  const nextSlide = () => {
    if (currentSlide < outlines.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      explainerRef.current?.startChat().catch(() => {});
      setChatMessages([{
        role: 'assistant',
        content: `Great job completing all ${outlines.length} slides on **${confirmedTopic}**! 🎉\n\nFeel free to ask me any questions or discuss any concept in more detail.`,
      }]);
      setStage('chat');
    }
  };

  const prevSlide = () => { if (currentSlide > 0) goToSlide(currentSlide - 1); };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !explainerRef.current?.isReady || chatStreaming) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setChatStreaming(true);

    const contextMsg = `The student just completed ${outlines.length} slides on "${confirmedTopic}". Topics covered: ${outlines.map(o => o.title).join(', ')}.

Student's question: ${msg}

Provide a clear, helpful response. Use **bold** for key terms, math equations with $...$ notation, and ASCII diagrams if helpful. Be concise but thorough.`;

    try {
      let assistantMsg = '';
      let streamingAdded = false;
      abortRef.current = new AbortController();

      await explainerRef.current.chat(
        contextMsg,
        (text) => {
          assistantMsg = text;
          setChatMessages((prev) => {
            if (streamingAdded) {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantMsg };
              return updated;
            }
            streamingAdded = true;
            return [...prev, { role: 'assistant', content: assistantMsg }];
          });
        },
        abortRef.current.signal
      );

      setChatMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === 'assistant') {
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg };
        }
        return updated;
      });
    } catch {
      // ignore abort
    } finally {
      setChatStreaming(false);
    }
  };

  const value: ExplainContextValue = {
    stage,
    aiStatus,
    aiMessage,
    downloadProgress,
    topicInput,
    setTopicInput,
    topicError,
    setTopicError,
    error,
    confirmedTopic,
    planningProgress,
    outlines,
    slides,
    currentSlide,
    isGenerating,
    streamText,
    chatMessages,
    chatInput,
    setChatInput,
    chatStreaming,
    chatEndRef,
    onStart,
    goToSlide,
    nextSlide,
    prevSlide,
    onGoHome: () => navigate('/'),
    sendChat,
    onBackToSlides: () => setStage('slides'),
  };

  return (
    <ExplainContext.Provider value={value}>
      {children}
    </ExplainContext.Provider>
  );
}