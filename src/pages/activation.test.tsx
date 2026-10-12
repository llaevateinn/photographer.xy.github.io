import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

afterEach(() => vi.restoreAllMocks());

function openActivation() {
  render(<App/>);
  fireEvent.click(screen.getByRole('tab', { name: '激活召回' }));
}

describe('M7 activation and outreach page', () => {
  it('shows ten qualified photographers sorted by dormant days and valid event/pay scripts', () => {
    vi.setSystemTime(new Date('2026-10-12T00:00:00Z'));
    openActivation();
    const rows = screen.getAllByRole('button', { name: /查看话术/ });
    expect(rows).toHaveLength(10);
    const days = rows.map((row) => Number(row.textContent?.match(/(\d+) 天/)?.[1]));
    expect(days).toEqual([...days].sort((a, b) => b - a));
    fireEvent.click(rows[0]);
    const script = screen.getByRole('textbox', { name: /召回话术/ });
    const scriptText = script as HTMLTextAreaElement;
    expect(scriptText.value).toContain('¥');
    expect(scriptText.value).toContain('报名');
    expect(scriptText.value).toMatch(/2026-/);
    expect(screen.getByText(/报酬依据/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('keeps script edits in the controlled editor and copies with temporary feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    openActivation();
    fireEvent.click(screen.getAllByRole('button', { name: /查看话术/ })[0]);
    const editor = screen.getByRole('textbox', { name: /召回话术/ });
    fireEvent.change(editor, { target: { value: '已编辑的尊重式邀请：本周深圳赛事 2026-10-18，报酬 ¥600–¥700，请回复报名。' } });
    expect((editor as HTMLTextAreaElement).value).toContain('已编辑的尊重式邀请');
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '复制话术' }));
    await act(async () => { await Promise.resolve(); });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('已编辑的尊重式邀请'));
    expect(screen.getByRole('button', { name: '已复制 ✓' })).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(screen.getByRole('button', { name: '复制话术' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
