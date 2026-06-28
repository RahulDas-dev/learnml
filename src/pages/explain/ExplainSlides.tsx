import { ThemeToggle } from '@/components/ThemeToggle';
import { renderSlideMarkdown } from '@/lib/markdownRenderer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader,
  MessageCircle,
} from 'lucide-react';
import { useExplain } from '@/hooks/useExplain';

export function ExplainSlides() {
  const {
    confirmedTopic,
    outlines,
    slides,
    currentSlide,
    isGenerating,
    streamText,
    onGoHome,
    goToSlide,
    nextSlide,
    prevSlide,
  } = useExplain();

  const slide = slides[currentSlide];
  const progress = ((currentSlide + 1) / outlines.length) * 100;

  return (
    <div className="min-h-screen">
      {/* Header with progress */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onGoHome}>
              <ArrowLeft size={16} strokeWidth={1.75} />
            </Button>
            <span className="font-bold text-sm text-foreground truncate max-w-48" style={{ fontFamily: 'Syne, sans-serif' }}>
              {confirmedTopic}
            </span>
            <span className="text-xs text-muted-foreground mono">
              {currentSlide + 1}/{outlines.length}
            </span>
          </div>
          <ThemeToggle />
        </div>
        {/* Progress bar */}
        <Progress value={progress} />
      </nav>

      {/* Floating sidebar */}
      <aside className="hidden lg:block fixed left-6 top-20 w-56 z-20">
        <ScrollArea className="max-h-[calc(100vh-6rem)]">
          <div className="space-y-1 p-1">
          {outlines.map((o, i) => (
            <button
              key={i}
              onClick={() => slides[i]?.generated && goToSlide(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                i === currentSlide
                  ? 'bg-secondary ring-2 ring-foreground font-medium text-foreground'
                  : slides[i]?.generated
                  ? 'text-muted-foreground hover:bg-secondary cursor-pointer'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                slides[i]?.generated
                  ? 'bg-secondary text-foreground'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {i + 1}
              </span>
              <span className="truncate">{o.title}</span>
            </button>
          ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Slide content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6 min-h-[400px]">
          {slide?.generated ? (
            <div
              className="explanation-content slide-content fade-in"
              dangerouslySetInnerHTML={{ __html: renderSlideMarkdown(slide.body) }}
            />
          ) : isGenerating ? (
            streamText ? (
              <div
                className="explanation-content slide-content fade-in cursor-blink"
                dangerouslySetInnerHTML={{ __html: renderSlideMarkdown(streamText) }}
              />
            ) : (
              <Card className="p-8 space-y-3 animate-pulse">
                <Skeleton className="h-6 w-3/5 mb-6" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-16 w-full mt-4" />
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3.5 w-5/6" />
              </Card>
            )
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Click Next to generate this slide
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="px-5 py-2.5 text-sm disabled:opacity-30"
          >
            <ChevronLeft size={15} /> Previous
          </Button>

          {/* Dot indicators */}
          <div className="hidden sm:flex gap-1.5">
            {outlines.map((_, i) => (
              <button
                key={i}
                onClick={() => slides[i]?.generated && goToSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide
                    ? 'bg-foreground scale-125'
                    : slides[i]?.generated
                    ? 'bg-foreground/30'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextSlide}
            disabled={isGenerating}
            className="px-5 py-2.5 text-sm"
          >
            {isGenerating ? (
              <><Loader size={14} className="animate-spin" /> Generating…</>
            ) : currentSlide === outlines.length - 1 ? (
              <>Start Discussion <MessageCircle size={15} /></>
            ) : (
              <>Next <ChevronRight size={15} /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}