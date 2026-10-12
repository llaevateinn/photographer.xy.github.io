import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import staffingStyles from '../staffing-page.css?raw';

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

  it('edits a displayed parameter inline, confirms with Enter and keeps the slider synchronized', () => {
    openStaffing();
    const initial = screen.getByRole('row', { name: /E006/ }).textContent;
    fireEvent.click(screen.getByRole('button', { name: '编辑精品率' }));
    const input = screen.getByRole('spinbutton', { name: '精品率数值' });
    fireEvent.change(input, { target: { value: '0.5' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.queryByRole('spinbutton', { name: '精品率数值' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑精品率' })).toHaveTextContent('50%');
    expect(screen.getByRole('slider', { name: '精品率' })).toHaveValue('0.5');
    expect(screen.getByRole('row', { name: /E006/ }).textContent).not.toBe(initial);

    fireEvent.click(screen.getByRole('button', { name: '编辑精品率' }));
    const invalidInput = screen.getByRole('spinbutton', { name: '精品率数值' });
    fireEvent.change(invalidInput, { target: { value: '1.5' } });
    fireEvent.keyDown(invalidInput, { key: 'Enter', code: 'Enter' });
    expect(invalidInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('slider', { name: '精品率' })).toHaveValue('0.5');
    fireEvent.keyDown(invalidInput, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('spinbutton', { name: '精品率数值' })).not.toBeInTheDocument();
  });

  it('adjusts the per-person event budget and updates the demand table', () => {
    openStaffing();
    fireEvent.change(screen.getByRole('spinbutton', { name: '每人每场预算' }), { target: { value: '900' } });
    const e006 = screen.getByRole('row', { name: /E006/ });
    expect(e006).toHaveTextContent('¥16,200');
    expect(screen.getByText(/推荐人数 × ¥900 \/ 场/)).toBeInTheDocument();
  });

  it('shows parameter values in bold SimHei without a pencil icon', () => {
    openStaffing();
    const displayedValue = screen.getByRole('button', { name: '编辑精品率' });
    expect(displayedValue).toHaveTextContent('60%');
    expect(displayedValue).not.toHaveTextContent('✎');
    expect(staffingStyles).toMatch(/\.parameter-value\{[^}]*font-family:"SimHei","黑体",sans-serif[^}]*font-weight:700/);
    expect(staffingStyles).toMatch(/\.parameter-panel \.parameter-control[^}]*font-family:"SimHei","黑体",sans-serif/);
  });
});
