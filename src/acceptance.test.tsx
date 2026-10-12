import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { scanRisks } from './engine/risk';
import { makeDefaultState } from './data/builtin';
import { calculateStaffing } from './engine/staffing';
import { assignPhotographers } from './engine/assign';

beforeEach(() => localStorage.clear());

describe('M10 PRD acceptance journey', () => {
  it('opens with all computed modules available and maintains hard staffing constraints', () => {
    render(<App/>);
    expect(screen.getByLabelText('运营概览')).toHaveTextContent('6');
    expect(screen.getByLabelText('运营概览')).toHaveTextContent('16');
    fireEvent.click(screen.getByRole('tab', { name: '需求测算' }));
    expect(screen.getAllByRole('row').length).toBeGreaterThan(6);
    fireEvent.click(screen.getByRole('tab', { name: '排班建议' }));
    const e006 = screen.getByRole('article', { name: 'E006 排班' });
    expect(e006).toHaveTextContent('缺口 8 人');
    expect(e006).not.toHaveTextContent('P004');
    expect(e006).not.toHaveTextContent('P009');
    expect(e006).not.toHaveTextContent('P013');
    fireEvent.click(screen.getByRole('tab', { name: '激活召回' }));
    expect(screen.getAllByRole('button', { name: /查看话术/ })).toHaveLength(10);
    fireEvent.click(screen.getByRole('tab', { name: '风险提示' }));
    expect(screen.getAllByRole('article', { name: '严重：供给不足' }).some((card) => card.textContent?.includes('E006'))).toBe(true);
  });

  it('persists a sensitivity change to local storage after the one-second debounce', async () => {
    vi.useFakeTimers();
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', { name: '需求测算' }));
    fireEvent.change(screen.getByRole('slider', { name: '精品率' }), { target: { value: '0.5' } });
    await act(async () => { vi.advanceTimersByTime(1000); });
    const saved = JSON.parse(localStorage.getItem('ayd_state_v1') ?? '{}');
    expect(saved.params.usable_rate).toBe(0.5);
    expect(saved.savedAt).toBeTruthy();
    vi.useRealTimers();
  });

  it('persists an edited outreach script and restores it from browser storage', async () => {
    vi.useFakeTimers();
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', { name: '激活召回' }));
    fireEvent.click(screen.getAllByRole('button', { name: /查看话术/ })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: /召回话术/ }), { target: { value: '保存后的召回文本' } });
    await act(async () => { vi.advanceTimersByTime(1000); });
    const saved = JSON.parse(localStorage.getItem('ayd_state_v1') ?? '{}');
    expect(Object.values(saved.scriptEdits)).toContain('保存后的召回文本');
    vi.useRealTimers();
  });

  it('downloads the four CSV outputs and makes no network requests while navigating', () => {
    const names: string[] = [];
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:acceptance') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: '下载当前表' }));
    fireEvent.click(screen.getByRole('tab', { name: '需求测算' })); fireEvent.click(screen.getByRole('button', { name: /下载 staffing_plan.csv/ }));
    fireEvent.click(screen.getByRole('tab', { name: '排班建议' })); fireEvent.click(screen.getByRole('button', { name: /下载 assignments.csv/ }));
    fireEvent.click(screen.getByRole('tab', { name: '激活召回' })); fireEvent.click(screen.getByRole('button', { name: /下载 activation_list.csv/ }));
    expect(names).toEqual(['events.csv', 'staffing_plan.csv', 'assignments.csv', 'activation_list.csv']);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('requires confirmation before restoring defaults and creates a protection snapshot', async () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }));
    expect(screen.getByRole('dialog', { name: '恢复全部默认数据？' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.getByText('共 6 行')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }));
    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('ayd_snapshots_v1') ?? '[]')).toHaveLength(1));
    expect(JSON.parse(localStorage.getItem('ayd_snapshots_v1') ?? '[]')[0].name).toBe('恢复前快照');
    expect(screen.getByText('共 6 行')).toBeInTheDocument();
  });

  it('flags cost overruns and same-day conflicts when scanning externally supplied schedules', () => {
    const state = makeDefaultState();
    const events = [state.events[0], { ...state.events[1], event_id: 'E099', event_date: state.events[0].event_date }];
    const photographer = { ...state.photographers[0], price_per_event: 900 };
    const plans = calculateStaffing(events, state.params).map((plan) => ({ ...plan, recommended: 1, estimatedCost: 700, budget: 700 }));
    const schedules = assignPhotographers(events, [photographer], plans);
    const risks = scanRisks(events, [photographer], plans, schedules);
    expect(risks.some((risk) => risk.title === '成本超标')).toBe(true);
    expect(risks.some((risk) => risk.title === '档期冲突')).toBe(false);
    const duplicate = [{ ...schedules[0], assignments: [schedules[0].assignments[0]] }, { ...schedules[1], assignments: [schedules[0].assignments[0]] }];
    expect(scanRisks(events, [photographer], plans, duplicate).some((risk) => risk.title === '档期冲突')).toBe(true);
  });
});
