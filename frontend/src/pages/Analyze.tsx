import { AnalysisForm } from '../components/analysis/AnalysisForm';
import { ResultSummary } from '../components/analysis/ResultSummary';
import { useAnalysis } from '../context/analysis-state';
import '../styles/analyze.css';

export function Analyze() {
  const { result } = useAnalysis();
  return <div className="analyze-experience">
    <header className="analyze-heading">
      <div><p className="analyze-kicker"><span />From transactions to understanding</p>
        <h1>Analyze your <em>customers</em></h1>
        <p className="analyze-introduction">Upload transactions or start with the example.</p>
      </div>
      <div className="analysis-method-note"><span>THE METHOD</span><p>RFM profiles <i aria-hidden="true">→</i> KMeans clusters</p><small>Groups based on past purchases.</small></div>
    </header>
    <AnalysisForm />
    {result && <ResultSummary result={result} />}
  </div>;
}
