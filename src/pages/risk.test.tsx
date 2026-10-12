import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { scanRisks } from '../engine/risk';
import { makeDefaultState } from '../data/builtin';

describe('M8 risk dashboard', () => {
  it('filters severity groups and routes a supply shortage to the assignment tab', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', { name: '风险提示' }));
    const supplyRisks = screen.getAllByRole('article', { name: '严重：供给不足' });
    const e006 = supplyRisks.find((card) => card.textContent?.includes('E006'))!;
    expect(e006).toHaveTextContent('补招摄影师');
    fireEvent.click(within(e006).getByRole('button', { name: /去看看/ }));
    expect(screen.getByRole('tab', { name: '排班建议' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: '风险提示' }));
    fireEvent.click(screen.getByRole('button', { name: /^警告/ }));
    expect(screen.getAllByText('低评分限制').length).toBeGreaterThan(0);
    expect(screen.queryByText('供给不足')).not.toBeInTheDocument();
  });

  it('shows an all-clear item when clean inputs generate no risks', () => {
    const state = makeDefaultState();
    const clean = scanRisks([], state.photographers.filter((p) => p.rating >= 3.5), [], []);
    expect(clean).toHaveLength(1);
    expect(clean[0].title).toBe('一切正常');
  });
});
