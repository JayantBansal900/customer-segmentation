import { writeFile } from 'node:fs/promises';

const origin = process.argv[2] || 'http://127.0.0.1:8000';
const response = await fetch(new URL('/openapi.json', origin));
if (!response.ok) throw new Error(`OpenAPI request failed: ${response.status}`);
const contract = await response.json();
if (!contract.paths?.['/api/analyze']?.post || !contract.components?.schemas?.AnalysisResponse) {
  throw new Error('Expected SegmentIQ endpoints/schemas are absent.');
}
await writeFile(new URL('../src/types/openapi.json', import.meta.url), JSON.stringify(contract, null, 2) + '\n');
console.log('Saved the actual backend OpenAPI contract. Run npm run generate:types next.');
