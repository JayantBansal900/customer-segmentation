import type { ReactNode } from 'react';

/** Native disclosure supports keyboard and touch without hover-only explanations. */
export function TechnicalDetails({ summary, children }: { summary: string; children: ReactNode }) {
  return <details className="copy-details"><summary>{summary}</summary><div>{children}</div></details>;
}
