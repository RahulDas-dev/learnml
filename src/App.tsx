import { HashRouter, Routes, Route } from 'react-router-dom';
import { GridBackground } from './components/GridBackground';
import HomePage from './pages/HomePage';
import TestSetupPage from './pages/TestSetupPage';
import MockTestPage from './pages/MockTestPage';
import ExplainPage from './pages/ExplainPage';
import NotFound from './pages/NotFound';
import { ExplainProvider } from './context/ExplainContext';
import { TestGenerating } from './pages/mock-test/TestGenerating';
import { TestQuiz } from './pages/mock-test/TestQuiz';
import { TestResults } from './pages/mock-test/TestResults';

function App() {
  return (
    <HashRouter>
      <GridBackground>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mock-test" element={<TestSetupPage />} />
          <Route path="/mock-test/:id" element={<MockTestPage />}>
            <Route path="generating" element={<TestGenerating />} />
            <Route path="quiz" element={<TestQuiz />} />
            <Route path="results" element={<TestResults />} />
          </Route>
          <Route path="/explain" element={<ExplainProvider><ExplainPage /></ExplainProvider>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GridBackground>
    </HashRouter>
  );
}

export default App;