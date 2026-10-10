import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const origin = process.argv[2] || 'http://127.0.0.1:5173';
const health = await fetch(new URL('/api/health', origin));
assert.equal(health.status, 200);
assert.equal((await health.json()).status, 'ok');
const fields = { selected_k: '2', candidate_k_min: '2', candidate_k_max: '3', preprocessing: 'log1p_standard' };
function form(csv) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  data.set('file', new Blob([csv], { type: 'text/csv' }), 'small.csv');
  return data;
}
const csv = 'CustomerID,InvoiceNo,InvoiceDate,Quantity,UnitPrice\n' + [
  ['0001', 'I1', '2024-01-01', 1, 2], ['A2', 'I2', '2024-01-02', 1, 3],
  ['03', 'I3', '2024-01-03', 1, 4], ['B4', 'I4', '2024-01-18', 1, 80],
  ['05', 'I5', '2024-01-19', 1, 90], ['C6', 'I6', '2024-01-20', 1, 100],
].map(row => row.join(',')).join('\n');
const started = performance.now();
const success = await fetch(new URL('/api/analyze', origin), { method: 'POST', body: form(csv) });
const content = await success.arrayBuffer();
const value = JSON.parse(new TextDecoder().decode(content));
assert.equal(success.status, 200);
assert.equal(value.metadata.customer_count, 6);
assert.equal(value.metadata.preprocessing, 'log1p_standard');
assert.equal(value.customers[0].customer_id, '0001');
const elapsed = (performance.now() - started) / 1000;
const invalid = await fetch(new URL('/api/analyze', origin), { method: 'POST', body: form('wrong,column\n1,2') });
assert.equal(invalid.status, 422);
const error = await invalid.json();
assert.equal(error.error.stage, 'ingestion');
const routes = {};
for (const path of ['/analyze', '/segments', '/insights', '/methodology', '/about', '/not-found']) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /id="root"/);
  routes[path] = 'Vite SPA fallback 200';
}
const evidence = { origin, transport: 'actual HTTP through the Vite development proxy',
  health_status: health.status, valid_upload_status: success.status, invalid_upload_status: invalid.status,
  valid_upload_elapsed_seconds: elapsed, valid_upload_response_bytes: content.byteLength,
  preprocessing: value.metadata.preprocessing, identifiers_preserved: true, routes };
await writeFile(new URL('../http-validation.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
