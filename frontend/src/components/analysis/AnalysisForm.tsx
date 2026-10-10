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
      <DatasetUpload config={config} running={running} uploadError={uploadError} onError={setUploadError} onFile={selectFile} onClear={() => updateConfig({ file: null })} />
      {config.source === 'example' && <div className="example-dataset"><span className="dataset-icon" aria-hidden="true">↗</span><div><strong>Online Retail.xlsx</strong><p>Analyze historical retail data. Allow a minute or longer.</p></div><span className="example-status">Example selected</span></div>}
      <section className="input-inspection" aria-labelledby="inspect-title"><h2 id="inspect-title">Inspect your input</h2>
        {config.source === 'example' ? <><p>Required transaction columns:</p><div className="schema-strip">{['CustomerID','InvoiceNo','InvoiceDate','Quantity','UnitPrice'].map(column => <code key={column}>{column}</code>)}</div><p className="help">Example records load when you run analysis.</p></> : <FilePreview file={config.file} />}
      </section>
    </fieldset>

    <fieldset disabled={running} className="analysis-step configuration-step">
      <legend><span className="workflow-index">02</span><span>Configure analysis</span></legend>
      <p className="step-introduction">Choose how to compare your customers.</p>
      <div className="configuration-layout">
        <div className="preprocessing-controls">
          <label className="field">Preprocessing mode<select value={config.preprocessing} onChange={event => updateConfig({ preprocessing: event.target.value as typeof config.preprocessing })}><option value="raw_standard">Original RFM scaling</option><option value="log1p_standard">Log-transformed RFM scaling</option></select></label>
          <p className="help">Original scales raw RFM. Log applies log1p before scaling to reduce skew.</p>
          <label className="field date-format-field">Optional date format<input value={config.dateFormat} maxLength={100} disabled={config.source !== 'csv'} placeholder="e.g. %d/%m/%Y" onChange={event => updateConfig({ dateFormat: event.target.value })} /><span className="help">Non-ISO CSV dates only. Leave blank for ISO or typed Excel dates.</span></label>
        </div>
        <div className="cluster-controls">
          <div className="k-settings">{([
            ['selectedK', 'Selected K'], ['candidateMin', 'Candidate K minimum'], ['candidateMax', 'Candidate K maximum'],
          ] as const).map(([key, label]) => <label className={`field ${key === 'selectedK' ? 'selected-k-field' : ''}`} key={key}>{label}<input type="number" min="2" max="50" step="1" required value={config[key]} onChange={event => updateConfig({ [key]: event.target.value })} /></label>)}</div>
          <p className="help">K is your number of groups. It must fit usable customers and distinct feature values. Evaluate up to 10 consecutive K values; your chosen K stays independent.</p>
          <div className="configuration-note"><span aria-hidden="true">↳</span><p>Results always show raw RFM values.</p></div>
        </div>
      </div>
    </fieldset>

    <section className="analysis-step run-step" aria-labelledby="run-title">
      <div className="run-heading"><span className="workflow-index">03</span><div><h2 id="run-title">Find the patterns.</h2><p>Ready to find your customer groups.</p></div></div>
      {issues.length > 0 && <ul id="configuration-issues" className="validation-list">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
      <div className="run-action-row"><p className="run-note">RFM profiles <span aria-hidden="true">→</span> KMeans clustering<br /><small>Results become available in Segments and Insights.</small></p>
        <div className="actions"><button className="button run-segmentation" type="submit" disabled={running || issues.length > 0 || !!uploadError} aria-describedby={issues.length ? 'configuration-issues' : undefined}>{running ? 'Analysis running…' : 'Run Segmentation'}<span aria-hidden="true">{running ? '◌' : '↗'}</span></button>{running && <button type="button" className="button secondary" onClick={cancel}>Stop waiting</button>}</div>
      </div>
      {running && <div className="processing-feedback" role="status" aria-live="polite"><span className="processing-signal" aria-hidden="true" /><div><p>Uploading and analyzing your dataset…</p><p>Large datasets may take a minute or longer.</p><p aria-hidden="true">Waiting {Math.floor(elapsed)} seconds</p><p className="help">Stop waiting cancels the browser request; server analysis continues.</p></div></div>}
      {error && <div role={status === 'cancelled' ? 'status' : 'alert'} className="error-box"><h3>{status === 'cancelled' ? 'Request wait cancelled' : 'Analysis could not finish'}</h3><p>{error.message}</p>
        {error.detail?.issues?.length ? <ul>{error.detail.issues.map((issue, i) => <li key={i}>{issue.column ? `${issue.column}: ` : ''}{issue.message}{issue.rows?.length ? ` (rows ${issue.rows.join(', ')})` : ''}{issue.location?.length ? ` [${issue.location.join(' → ')}]` : ''}</li>)}</ul> : null}
        {error.detail && <p className="help">Reference: {error.detail.request_id} · stage: {error.detail.stage}</p>}
      </div>}
      {status === 'success' && <p className="completion-time" role="status">Analysis completed in {formatNumber(elapsed)} seconds end to end.</p>}
    </section>
  </form>;
}
