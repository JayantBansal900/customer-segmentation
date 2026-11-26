import { AnalysisForm } from '../components/analysis/AnalysisForm';
import { ResultSummary } from '../components/analysis/ResultSummary';
import { useAnalysis } from '../context/analysis-state';
import '../styles/analyze.css';

export function Analyze() {
  const { result } = useAnalysis();
  return <div className="analyze-experience">
    <header className="analyze-heading">
      <div>
        <h1>Analyze your customers</h1>
        <p className="analyze-introduction">Pick your data, choose how many groups you want, and run.</p>
      </div>
    </header>
    <AnalysisForm />
    {result && <ResultSummary result={result} />}
  </div>;
}
