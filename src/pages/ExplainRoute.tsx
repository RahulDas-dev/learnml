import { ExplainProvider } from '@/context/ExplainContext';
import ExplainPage from '@/pages/ExplainPage';

/**
 * Lazy-loaded entry for the Explain feature. Bundling the provider + page here
 * (rather than wiring the provider in App) keeps the agents/KaTeX code in this
 * route's own chunk, off the initial load.
 */
export default function ExplainRoute() {
  return (
    <ExplainProvider>
      <ExplainPage />
    </ExplainProvider>
  );
}
