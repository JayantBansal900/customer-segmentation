import { useRef, useState, type DragEvent } from 'react';
import type { AnalysisConfig } from '../../types/analysis';
import { MAX_UPLOAD_BYTES, validateConfig } from '../../utils/config';
import { formatNumber } from '../../utils/format';

interface Props {
  config: AnalysisConfig;
  running: boolean;
  uploadError: string;
  onError(message: string): void;
  onFile(file: File): void;
  onClear(): void;
}

export function DatasetUpload({ config, running, uploadError, onError, onFile, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const fileIssues = config.source === 'example' ? [] : validateConfig(config).filter(issue => /file|upload-size/i.test(issue));
  const invalid = !!uploadError || !!(config.file && fileIssues.length);
  function receive(files: File[]) {
    if (running) return;
    if (files.length !== 1) { onError('Choose one CSV or XLSX file at a time. Your current selection was kept.'); return; }
    onError(''); onFile(files[0]);
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false);
    receive(Array.from(event.dataTransfer.files));
  }
  return <div className={`dataset-upload${dragging ? ' is-dragging' : ''}${invalid ? ' has-file-error' : ''}`} role="group" aria-label="Dataset upload zone"
    onDragEnter={event => { event.preventDefault(); if (!running) setDragging(true); }}
    onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = running ? 'none' : 'copy'; }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={drop}>
    <div className="upload-symbol" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M16 7h12l9 9v25H11V12a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3" /><path d="M28 7v10h9M24 33V22m-5 5 5-5 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
    <div className="upload-copy">
      <h3>{config.file ? config.file.name : 'Choose your transaction file.'}</h3>
      <p>{config.file ? `${config.file.size < 1024 * 1024 ? formatNumber(config.file.size) + ' bytes' : formatNumber(config.file.size / 1024 / 1024) + ' MiB'} · ${config.file.name.split('.').pop()?.toUpperCase()}` : 'Drop a CSV or XLSX here, or browse your files.'}</p>
      <span className="upload-file-status">{config.file ? invalid ? 'Review the file issues below' : 'Selected · awaiting validation' : 'CSV / XLSX · One file · Up to ' + formatNumber(MAX_UPLOAD_BYTES / 1024 / 1024) + ' MiB'}</span>
    </div>
    <div className="upload-actions">
      <button type="button" className="browse-button" disabled={running} onClick={() => input.current?.click()}>{config.file ? 'Replace file' : 'Browse files'}<span aria-hidden="true">↗</span></button>
      {config.file && <button type="button" className="remove-file" disabled={running} onClick={() => { onError(''); onClear(); if (input.current) input.current.value = ''; }}>Remove file</button>}
    </div>
    <label className="upload-input-label">Dataset file<input ref={input} type="file" accept=".csv,.xlsx" disabled={running} aria-describedby="upload-guidance" aria-invalid={invalid || undefined}
      onChange={event => { const files = Array.from(event.target.files ?? []); if (files.length) receive(files); event.target.value = ''; }} /></label>
    <p className="upload-guidance" id="upload-guidance">Choosing a file selects its format. This size check is preliminary; the server validates the full dataset.</p>
    {uploadError && <div className="upload-error" role="alert"><p>{uploadError}</p><button type="button" className="remove-file" disabled={running} onClick={() => onError('')}>Dismiss upload error</button></div>}
    {config.file && fileIssues.length > 0 && <ul className="upload-error" role="alert">{fileIssues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
  </div>;
}

