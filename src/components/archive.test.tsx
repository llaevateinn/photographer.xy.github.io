import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { exportArchive } from '../lib/archive';
import { makeDefaultState } from '../data/builtin';

beforeEach(() => localStorage.clear());

function openMenu() { fireEvent.click(screen.getByRole('button', { name: '手动存档⌄' })); }

describe('M9 manual archives and persistence controls', () => {
  it('saves named snapshots and protects data before a confirmed restore', async () => {
    render(<App/>);
    openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '保存快照' }));
    fireEvent.change(screen.getByRole('textbox', { name: '快照名称' }), { target: { value: '周会版本' } });
    fireEvent.click(screen.getByRole('button', { name: '保存快照' }));
    expect(await screen.findByText('快照已保存')).toBeInTheDocument();

    openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '管理快照' }));
    const row = screen.getByText('周会版本').closest('.snapshot-row')!;
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '重命名' }));
    fireEvent.change(screen.getByRole('textbox', { name: '重命名快照' }), { target: { value: '周会定稿' } });
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '保存' }));
    expect(screen.getByText('周会定稿')).toBeInTheDocument();
    fireEvent.click(within(screen.getByText('周会定稿').closest('.snapshot-row')!).getByRole('button', { name: '恢复' }));
    expect(screen.getByRole('dialog', { name: '恢复这份快照？' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }));
    await waitFor(() => expect(screen.getByText('恢复前快照')).toBeInTheDocument());
  });

  it('imports valid JSON with a protection snapshot and leaves state untouched on invalid JSON', async () => {
    render(<App/>);
    const importedState = makeDefaultState();
    importedState.events = importedState.events.slice(0, 1);
    openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '导入存档文件' }));
    const file = new File([exportArchive(importedState)], 'archive.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('导入 JSON 存档'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('共 1 行')).toBeInTheDocument());
    expect(localStorage.getItem('ayd_snapshots_v1')).toContain('恢复前快照');

    openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '导入存档文件' }));
    const broken = new File(['{"format":"ayd-archive","version":1,"state":{"version":1}}'], 'broken.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('导入 JSON 存档'), { target: { files: [broken] } });
    expect(await screen.findByText(/存档导入失败/)).toBeInTheDocument();
    expect(screen.getByText('共 1 行')).toBeInTheDocument();
  });

  it('offers JSON export from the archive menu', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App/>); openMenu(); fireEvent.click(screen.getByRole('menuitem', { name: '导出存档文件' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByText('JSON 存档文件已导出')).toBeInTheDocument();
  });
});
