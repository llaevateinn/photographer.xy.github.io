import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

function openStaffing() {
  render(<App/>);
  fireEvent.click(screen.getByRole('tab', { name: '需求测算' }));
}

describe('M5 staffing analysis page', () => {
  it('shows every event, budget and the expanded auditable formula', () => {
    openStaffing();
    expect(screen.getByRole('row', { name: /E006/ })).toHaveTextContent('18');
    fireEvent.click(screen.getByRole('row', { name: /E006/ }));
    expect(screen.getByText(/目标可用照片 = 6000 × 0.85 × 3 = 15300.00 张/)).toBeInTheDocument();
    expect(screen.getByText(/摄影师单人有效产能/)).toBeInTheDocument();
    expect(screen.getByText(/推荐人数 = ceil/)).toBeInTheDocument();
  });

  it('recalculates all rows as a parameter changes and restores the PRD defaults', () => {
    openStaffing();
    const initial = screen.getByRole('row', { name: /E006/ }).textContent;
    fireEvent.change(screen.getByRole('slider', { name: '精品率' }), { target: { value: '0.5' } });
    expect(screen.getByText('已修改')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /E006/ }).textContent).not.toBe(initial);
    fireEvent.click(screen.getByRole('button', { name: '恢复默认参数' }));
    expect(screen.queryByText('已修改')).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '精品率' })).toHaveValue('0.6');
  });

  it('sorts the demand table by recommendation count', () => {
    openStaffing();
    const table = screen.getByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '按推荐人数排序' }));
    expect(table.querySelector('tbody tr')?.textContent).toContain('E003');
    expect(table.querySelector('thead th:nth-child(3)')).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(screen.getByRole('button', { name: '按推荐人数排序' }));
    expect(table.querySelector('thead th:nth-child(3)')).toHaveAttribute('aria-sort', 'descending');
  });

  it('accepts a manual parameter value, synchronizes the slider and recalculates results', () => {
    openStaffing();
    const initial = screen.getByRole('row', { name: /E006/ }).textContent;
    const input = screen.getByRole('spinbutton', { name: '精品率数值' });
    fireEvent.change(input, { target: { value: '0.5' } });
    expect(input).toHaveValue(0.5);
    expect(screen.getByRole('slider', { name: '精品率' })).toHaveValue('0.5');
    expect(screen.getByRole('row', { name: /E006/ }).textContent).not.toBe(initial);

    fireEvent.change(input, { target: { value: '1.5' } });
    expect(input).toHaveValue(0.5);
  });
});
