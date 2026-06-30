import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GridBackground } from './components/GridBackground';
import HomePage from './pages/HomePage';

// Heavy routes (AI agents, KaTeX, quiz/explain flows) are code-split so the
// landing page loads fast. HomePage stays eager as the primary entry point.
const TestSetupPage = lazy(() => import('./pages/TestSetupPage'));
const MockTestPage = lazy(() => import('./pages/MockTestPage'));
const ExplainRoute = lazy(() => import('./pages/ExplainRoute'));
const NotFound = lazy(() => import('./pages/NotFound'));
const TestGenerating = lazy(() => import('./pages/mock-test/TestGenerating').then((m) => ({ default: m.TestGenerating })));
const TestQuiz = lazy(() => import('./pages/mock-test/TestQuiz').then((m) => ({ default: m.TestQuiz })));
const TestResults = lazy(() => import('./pages/mock-test/TestResults').then((m) => ({ default: m.TestResults })));

function App() {
  return (
    <HashRouter>
      <GridBackground>
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mock-test" element={<TestSetupPage />} />
            <Route path="/mock-test/:id" element={<MockTestPage />}>
              <Route path="generating" element={<TestGenerating />} />
              <Route path="quiz" element={<TestQuiz />} />
              <Route path="results" element={<TestResults />} />
            </Route>
            <Route path="/explain" element={<ExplainRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </GridBackground>
    </HashRouter>
  );
}

export default App;
