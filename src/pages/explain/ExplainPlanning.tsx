import { PageHeader } from '@/components/PageHeader';
import { Loader } from 'lucide-react';
import { useExplain } from '@/hooks/useExplain';

export function ExplainPlanning() {
  const { confirmedTopic, planningProgress } = useExplain();

  return (
    <div className="min-h-screen">
      <PageHeader title="Explain Topic" />
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center fade-in">
          <Loader size={32} className="animate-spin text-muted-foreground mx-auto mb-6" />
          <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            Planning your lesson
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{confirmedTopic}</p>
          <p className="text-xs text-muted-foreground animate-pulse">{planningProgress}</p>
        </div>
      </div>
    </div>
  );
}