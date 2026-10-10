import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { BarChart } from '../components/charts/BarChart';

it('explains a chart with no available candidate metrics', () => {
  render(<BarChart title="Candidate inertia" bars={[]} />);
  expect(screen.getByText('No values are available for this chart.')).toBeInTheDocument();
});
