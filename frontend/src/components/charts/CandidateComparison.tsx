import { TechnicalDetails } from '../ui/TechnicalDetails';
import type { AnalysisResponse } from '../../types/analysis';
import { formatScore } from '../../utils/format';

export function CandidateComparison({ quality, selectedK }: { quality: AnalysisResponse['model_quality']; selectedK: number }) {
  const candidates=quality.candidates;
  const scored=candidates.filter(c=>c.silhouette != null);
  const selectedEvaluated=candidates.some(c=>c.k===selectedK);
  const x=(k:number)=>55+(candidates.length>1 ? (k-Math.min(...candidates.map(c=>c.k)))/(Math.max(...candidates.map(c=>c.k))-Math.min(...candidates.map(c=>c.k)))*330 : 165);
  const y=(score:number)=>22+(1-score)/2*170;
  return <figure className="panel candidate-curve"><figcaption>Silhouette by candidate K</figcaption><p className="help">Selected K: {selectedK}. {selectedEvaluated ? 'Aqua marks your chosen K; champagne marks other scored candidates.' : 'Your chosen K was not evaluated in this candidate set and is not plotted here.'}</p>
    {scored.length ? <svg viewBox="0 0 420 235" role="img" aria-label={`Candidate silhouette scores on a scale from minus one to one. Selected K ${selectedK} ${selectedEvaluated ? 'is marked' : 'was not evaluated in this candidate set'}. Exact scores are in the candidate table.`}>
      {[-1,0,1].map(tick=><g key={tick}><line x1="55" x2="385" y1={y(tick)} y2={y(tick)} stroke="#9bbba52b" /><text x="40" y={y(tick)+5} textAnchor="end" fill="#a7c0b1" fontSize="12">{tick}</text></g>)}
      {candidates.map(c=><g key={c.k}><text x={x(c.k)} y="216" textAnchor="middle" fill={c.k===selectedK?'#66dccb':'#a7c0b1'} fontSize="12">K={c.k}</text>{c.k===selectedK&&<line x1={x(c.k)} x2={x(c.k)} y1="17" y2="197" stroke="#66dccb80" strokeDasharray="4 4" />}</g>)}
      {scored.map(c=><circle key={c.k} cx={x(c.k)} cy={y(c.silhouette!)} r={c.k===selectedK?7:5} fill={c.k===selectedK?'#66dccb':'#e7cca0'} tabIndex={0} aria-label={`K ${c.k}: silhouette ${formatScore(c.silhouette)}${c.k===selectedK?', selected':''}`}><title>K={c.k}: {formatScore(c.silhouette)}{c.k===selectedK?' · Selected model':''}</title></circle>)}
    </svg> : <p>No valid silhouette scores are available for these candidates.</p>}
    <p className="help">Higher valid scores mean clearer separation in this feature space.</p><TechnicalDetails summary="Silhouette chart details"><p>Scores across preprocessing modes are not directly comparable. Missing scores are omitted; the table explains why.</p></TechnicalDetails>
  </figure>;
}
