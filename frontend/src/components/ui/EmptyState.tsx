import { Link } from 'react-router-dom';
import { useAnalysis } from '../../context/analysis-state';

export function EmptyState() {
  const { status, invalidated } = useAnalysis();
  return <section className="panel empty-state">
    <h2>{status === 'running' ? 'Your analysis is running' : 'Start with your transaction data'}</h2>
    <p>{invalidated ? 'Results were cleared after the data or model settings changed. Run a new analysis to explore this configuration.' : status === 'running' ? 'The results will appear here when the request finishes. You can return to Analyze to view the waiting state.' : 'Run segmentation using the Online Retail example or your own CSV/XLSX dataset.'}</p>
    <Link className="button" to="/analyze">Go to Analyze</Link>
  </section>;
}
