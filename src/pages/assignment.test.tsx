import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('M6 assignment recommendations page', () => {
  it('shows event staffing, shortages, cost bars, cross-city details and selection reasons', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', { name: '排班建议' }));
    const e006 = screen.getByRole('article', { name: 'E006 排班' });
    expect(e006).toHaveTextContent('缺口 8 人');
    expect(e006).toHaveTextContent('¥');
    expect(e006).toHaveTextContent('跨城');
    expect(e006).toHaveTextContent('评分');
    expect(e006).toHaveTextContent('具备夜拍技能');
    expect(within(e006).getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('exposes an assignments CSV download action and a total summary', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', { name: '排班建议' }));
    expect(screen.getByRole('button', { name: /下载 assignments.csv/ })).toBeInTheDocument();
    expect(screen.getByText('总成本')).toBeInTheDocument();
    expect(screen.getByText('跨城调度')).toBeInTheDocument();
  });
});
