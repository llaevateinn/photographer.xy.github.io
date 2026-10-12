import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

function setClipboard(clipboard: { readText: () => Promise<string>; writeText: (text: string) => Promise<void> }) {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
  return () => original ? Object.defineProperty(navigator, 'clipboard', original) : Reflect.deleteProperty(navigator, 'clipboard');
}

describe('M4 data management page', () => {
  it('reports row-level CSV errors and keeps the prior event table intact', async () => {
    render(<App/>);
    expect(screen.getByText('E001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '粘贴 CSV' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'CSV 内容' }), { target: { value: 'event_id,city,event_date,participants,course_km,time_window_hours,night_race,difficulty\nEX,广州,2026-11-01,oops,42,4,no,4' } });
    fireEvent.click(screen.getByRole('button', { name: '校验并替换' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('第 2 行');
    expect(screen.getByText('E001')).toBeInTheDocument();
    expect(screen.queryByText('EX')).not.toBeInTheDocument();
  });

  it('replaces a valid pasted CSV, recalculates the page and switches input tables', async () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: '粘贴 CSV' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'CSV 内容' }), { target: { value: 'event_id,city,event_date,participants,course_km,time_window_hours,night_race,difficulty\nEX,广州,2026-11-01,1200,21,3,no,3' } });
    fireEvent.click(screen.getByRole('button', { name: '校验并替换' }));
    await waitFor(() => expect(screen.getByText('EX')).toBeInTheDocument());
    expect(screen.getByText('共 1 行')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /摄影师供给表/ }));
    expect(screen.getByText('P001')).toBeInTheDocument();
    expect(screen.getByText('共 16 行')).toBeInTheDocument();
  });

  it('sorts the event preview by a selected column in both directions', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: '按参赛人数排序' }));
    const table = screen.getByRole('table');
    expect(table.querySelector('tbody tr')?.textContent).toContain('E003');
    expect(table.querySelector('thead th:nth-child(5)')).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(screen.getByRole('button', { name: '按参赛人数排序' }));
    expect(table.querySelector('tbody tr')?.textContent).toContain('E006');
    expect(table.querySelector('thead th:nth-child(5)')).toHaveAttribute('aria-sort', 'descending');
  });

  it('manually adds a validated event without replacing existing events', async () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: '新增赛事' }));
    fireEvent.change(screen.getByRole('textbox', { name: '赛事 ID' }), { target: { value: 'MANUAL-1' } });
    fireEvent.change(screen.getByRole('textbox', { name: '城市' }), { target: { value: '佛山' } });
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText('参赛人数'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('赛道 km'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('拍摄时长'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('夜跑'), { target: { value: 'no' } });
    fireEvent.change(screen.getByLabelText('难度'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '保存赛事' }));

    expect(await screen.findByText('MANUAL-1')).toBeInTheDocument();
    expect(screen.getByText('共 7 行')).toBeInTheDocument();
    expect(screen.getByText('E001')).toBeInTheDocument();
  });

  it('manually adds a photographer and rejects an ID that already exists', async () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', { name: /摄影师供给表/ }));
    fireEvent.click(screen.getByRole('button', { name: '新增摄影师' }));
    fireEvent.change(screen.getByRole('textbox', { name: '摄影师 ID' }), { target: { value: 'P017' } });
    fireEvent.change(screen.getByRole('textbox', { name: '常驻城市' }), { target: { value: '佛山' } });
    fireEvent.change(screen.getByLabelText('单场报价'), { target: { value: '800' } });
    fireEvent.change(screen.getByLabelText('评分'), { target: { value: '4.6' } });
    fireEvent.change(screen.getByLabelText('沉睡天数'), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox', { name: '技能标签' }), { target: { value: '跑步|冲线' } });
    fireEvent.change(screen.getByLabelText('可接单'), { target: { value: 'yes' } });
    fireEvent.click(screen.getByRole('button', { name: '保存摄影师' }));
    expect(await screen.findByText('P017')).toBeInTheDocument();
    expect(screen.getByText('共 17 行')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '新增摄影师' }));
    fireEvent.change(screen.getByRole('textbox', { name: '摄影师 ID' }), { target: { value: 'P001' } });
    fireEvent.change(screen.getByRole('textbox', { name: '常驻城市' }), { target: { value: '佛山' } });
    fireEvent.change(screen.getByLabelText('单场报价'), { target: { value: '800' } });
    fireEvent.change(screen.getByLabelText('评分'), { target: { value: '4.6' } });
    fireEvent.change(screen.getByLabelText('沉睡天数'), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox', { name: '技能标签' }), { target: { value: '跑步' } });
    fireEvent.change(screen.getByLabelText('可接单'), { target: { value: 'yes' } });
    fireEvent.click(screen.getByRole('button', { name: '保存摄影师' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ID 已存在');
    expect(screen.getByText('共 17 行')).toBeInTheDocument();
  });

  it('appends an uploaded CSV to the current event table when append mode is selected', async () => {
    render(<App/>);
    fireEvent.change(screen.getByLabelText('CSV 导入方式'), { target: { value: 'append' } });
    const file = new File(
      ['event_id,city,event_date,participants,course_km,time_window_hours,night_race,difficulty\nEX,佛山,2026-12-01,3000,10,2,no,2'],
      'events.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(screen.getByLabelText('上传 CSV 文件'), { target: { files: [file] } });
    expect(await screen.findByText('EX')).toBeInTheDocument();
    expect(screen.getByText('E001')).toBeInTheDocument();
    expect(screen.getByText('共 7 行')).toBeInTheDocument();

    const duplicate = new File(
      ['event_id,city,event_date,participants,course_km,time_window_hours,night_race,difficulty\nE001,佛山,2026-12-02,3000,10,2,no,2'],
      'duplicate.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(screen.getByLabelText('上传 CSV 文件'), { target: { files: [duplicate] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('ID 已存在：E001');
    expect(screen.getByText('共 7 行')).toBeInTheDocument();
  });

  it('deletes an event and restores it with the undo action', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: '删除赛事 E001' }));
    expect(screen.queryByText('E001')).not.toBeInTheDocument();
    expect(screen.getByText('共 5 行')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '撤回删除' }));
    expect(screen.getByText('E001')).toBeInTheDocument();
    expect(screen.getByText('共 6 行')).toBeInTheDocument();
  });

  it('deletes and restores a photographer row as well', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('tab', { name: /摄影师供给表/ }));
    fireEvent.click(screen.getByRole('button', { name: '删除摄影师 P001' }));
    expect(screen.queryByText('P001')).not.toBeInTheDocument();
    expect(screen.getByText('共 15 行')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '撤回删除' }));
    expect(screen.getByText('P001')).toBeInTheDocument();
    expect(screen.getByText('共 16 行')).toBeInTheDocument();
  });

  it('copies a CSV example to the clipboard and imports clipboard text by detected table type', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const restoreClipboard = setClipboard({ readText: vi.fn().mockResolvedValue(''), writeText });
    try {
      render(<App/>);
      fireEvent.click(screen.getByRole('button', { name: '粘贴 CSV' }));
      fireEvent.click(screen.getByRole('button', { name: '复制 CSV 示例' }));
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('event_id,city,event_date,participants'));
    } finally {
      restoreClipboard();
    }
  });

  it('reads copied photographer CSV from the clipboard, identifies it and imports to that table', async () => {
    const csv = 'photographer_id,home_city,price_per_event,rating,last_active_days,skill_tags,available\nP017,佛山,800,4.6,3,跑步|冲线,yes';
    const restoreClipboard = setClipboard({ readText: vi.fn().mockResolvedValue(csv), writeText: vi.fn().mockResolvedValue(undefined) });
    try {
      render(<App/>);
      fireEvent.click(screen.getByRole('button', { name: '粘贴 CSV' }));
      fireEvent.click(screen.getByRole('button', { name: '从剪贴板读取' }));
      expect(await screen.findByText('识别为摄影师供给表')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'CSV 内容' })).toHaveValue(csv);
      fireEvent.click(screen.getByRole('button', { name: '校验并替换' }));
      expect(await screen.findByText('P017')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /摄影师供给表/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('共 1 行')).toBeInTheDocument();
    } finally {
      restoreClipboard();
    }
  });

  it('accepts Ctrl+V on the upload area and auto-detects the pasted CSV table', async () => {
    const csv = 'photographer_id,home_city,price_per_event,rating,last_active_days,skill_tags,available\nP017,佛山,800,4.6,3,跑步|冲线,yes';
    render(<App/>);
    fireEvent.paste(screen.getByRole('region', { name: 'CSV 上传与粘贴区域' }), { clipboardData: { getData: () => csv } });
    expect(await screen.findByText('P017')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /摄影师供给表/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('共 1 行')).toBeInTheDocument();
  });
});
