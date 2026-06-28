import { useExplain } from '@/hooks/useExplain';
import { ExplainSetup } from '@/pages/explain/ExplainSetup';
import { ExplainPlanning } from '@/pages/explain/ExplainPlanning';
import { ExplainSlides } from '@/pages/explain/ExplainSlides';
import { ExplainChat } from '@/pages/explain/ExplainChat';

export default function ExplainPage() {
  const { stage } = useExplain();

  const stages = {
    setup: <ExplainSetup />,
    planning: <ExplainPlanning />,
    slides: <ExplainSlides />,
    chat: <ExplainChat />,
  };

  return stages[stage];
}