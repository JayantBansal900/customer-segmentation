import { useState, type FormEvent } from 'react';
import { useAnalysis } from '../../context/analysis-state';
import type { DatasetSource } from '../../types/analysis';
import { validateConfig } from '../../utils/config';
import { formatNumber } from '../../utils/format';
import { FilePreview } from './FilePreview';
import { DatasetUpload } from './DatasetUpload';

const SOURCES: [DatasetSource, string, string][] = [
  ['example', 'Built-in Online Retail dataset', 'Explore the example'],
  ['csv', 'Upload custom CSV', 'Comma-separated records'],
  ['xlsx', 'Upload custom XLSX', 'Excel workbook'],
];

export function AnalysisForm() {
  const { config, status, error, invalidated, elapsed, updateConfig, run, cancel } = useAnalysis();
  const running = status === 'running';
  const issues = validateConfig(config);
  const [uploadError, setUploadError] = useState('');
  function selectFile(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const source = extension === 'xlsx' ? 'xlsx' : 'csv';
    updateConfig({ file, source, dateFormat: source === 'csv' ? config.dateFormat : '' });
  }
  function submit(event: FormEvent) { event.preventDefault(); if (!running && !issues.length && !uploadError) void run(); }

  return <form onSubmit={submit} aria-busy={running} className="analysis-form premium-analysis-form">
    {invalidated && <p className="notice" role="status">Results cleared: the dataset or model configuration changed.</p>}
    <fieldset disabled={running} className="analysis-step data-step">
      <legend><span className="workflow-index">01</span><span>Choose your data source</span></legend>
      <p className="step-introduction">Upload a file or use the example.</p>
      <div className="source-options">{SOURCES.map(([source, label, detail]) => <label key={source} className={`source-option${config.source === source ? ' source-selected' : ''}`}>
        <input type="radio" name="source" value={source} aria-label={label} checked={config.source === source} onChange={() => { setUploadError(''); updateConfig({ source, file: null, dateFormat: '' }); }} />
        <span><strong>{label}</strong><small>{detail}</small></span>
      </label>)}</div>
      {config.source === 'example' && <div className="example-dataset"><span className="dataset-icon" aria-hidden="true">↗</span><div><strong>Online Retail.xlsx</strong><p>541,909 real transactions from a UK online retailer, 2010–2011.</p></div><span className="example-status">Ready to run</span></div>}
      <DatasetUpload config={config} running={running} uploadError={uploadError} onError={setUploadError} onFile={selectFile} onClear={() => updateConfig({ file: null })} />
      {config.source !== 'example' && <section className="input-inspection" aria-labelledby="inspect-title"><h2 id="inspect-title">Inspect your input</h2><FilePreview file={config.file} /></section>}
    </fieldset>

    <fieldset disabled={running} className="analysis-step configuration-step">
      <legend><span className="workflow-index">02</span><span>Configure analysis</span></legend>
      <p className="step-introduction">Choose how to compare your customers.</p>
      <div className="configuration-layout">
        <div className="preprocessing-controls">
          <label className="field">Preprocessing mode<select value={config.preprocessing} onChange={event => updateConfig({ preprocessing: event.target.value as typeof config.preprocessing })}><option value="raw_standard">Original RFM scaling</option><option value="log1p_standard">Log-transformed RFM scaling</option></select></label>
          <p className="help">Log-transformed works better when a few customers spend far more than the rest.</p>
          <label className="field date-format-field">Optional date format<input value={config.dateFormat} maxLength={100} disabled={config.source !== 'csv'} placeholder="e.g. %d/%m/%Y" onChange={event => updateConfig({ dateFormat: event.target.value })} /><span className="help">Only needed for CSV dates like 31/12/2024. Leave blank otherwise.</span></label>
        </div>
        <div className="cluster-controls">
          <div className="k-settings">{([
            ['selectedK', 'Selected K'], ['candidateMin', 'Candidate K minimum'], ['candidateMax', 'Candidate K maximum'],
          ] as const).map(([key, label]) => <label className={`field ${key === 'selectedK' ? 'selected-k-field' : ''}`} key={key}>{label}<input type="number" min="2" max="50" step="1" required value={config[key]} onChange={event => updateConfig({ [key]: event.target.value })} /></label>)}</div>
          <p className="help">K is the number of groups you want. Segmentra also scores up to 10 K values and recommends one.</p>
        </div>
      </div>
    </fieldset>

    <section className="analysis-step run-step" aria-labelledby="run-title">
      <div className="run-heading"><span className="workflow-index">03</span><div><h2 id="run-title">Run the analysis</h2><p>{config.source === 'example' ? 'The example takes about 10 seconds.' : 'Large files can take up to a minute.'}</p></div></div>
      {issues.length > 0 && <ul id="configuration-issues" className="validation-list">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
      <div className="run-action-row"><p className="run-note">Results open in Segments and Insights.</p>
        <div className="actions"><button className="button run-segmentation" type="submit" disabled={running || issues.length > 0 || !!uploadError} aria-describedby={issues.length ? 'configuration-issues' : undefined}>{running ? 'Analysis running…' : 'Run Segmentation'}<span aria-hidden="true">{running ? '◌' : '↗'}</span></button>{running && <button type="button" className="button secondary" onClick={cancel}>Stop waiting</button>}</div>
      </div>
      {running && <div className="processing-feedback" role="status" aria-live="polite"><span className="processing-signal" aria-hidden="true" /><div><p>Uploading and analyzing your dataset…</p><p>Large files can take up to a minute.</p><p aria-hidden="true">Waiting {Math.floor(elapsed)} seconds</p></div></div>}
      {error && <div role={status === 'cancelled' ? 'status' : 'alert'} className="error-box"><h3>{status === 'cancelled' ? 'Request wait cancelled' : 'Analysis could not finish'}</h3><p>{error.message}</p>
        {error.detail?.issues?.length ? <ul>{error.detail.issues.map((issue, i) => <li key={i}>{issue.column ? `${issue.column}: ` : ''}{issue.message}{issue.rows?.length ? ` (rows ${issue.rows.join(', ')})` : ''}{issue.location?.length ? ` [${issue.location.join(' → ')}]` : ''}</li>)}</ul> : null}
        {error.detail && <p className="help">Reference: {error.detail.request_id} · stage: {error.detail.stage}</p>}
      </div>}
      {status === 'success' && <p className="completion-time" role="status">Analysis completed in {formatNumber(elapsed)} seconds end to end.</p>}
    </section>
  </form>;
}
