import { useRef, useState } from 'react';
import type { Snapshot } from '../types';
import { useAppState } from '../state/AppState';
import { deleteSnapshot, exportArchive, importArchive, listSnapshots, protectCurrentState, renameSnapshot, restoreSnapshot, saveSnapshot } from '../lib/archive';
import { readFileAsText } from '../lib/csv';
import { ConfirmDialog, Modal, Toast } from './ui';

type Pending = { kind: 'restore' | 'delete'; snapshot: Snapshot } | null;

function saveTextFile(filename: string, text: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export default function ArchiveControl() {
  const { state, dispatch } = useAppState();
  const fileInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [name, setName] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [toast, setToast] = useState<string | null>(null);

  function startSave() {
    const date = new Date();
    setName(`存档 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    setMenuOpen(false); setSaveOpen(true);
  }

  function commitSave() {
    saveSnapshot(state, name); setSnapshots(listSnapshots()); setSaveOpen(false); setToast('快照已保存');
  }

  function startManage() {
    setSnapshots(listSnapshots()); setMenuOpen(false); setManageOpen(true);
  }

  function confirmPending() {
    if (!pending) return;
    if (pending.kind === 'restore') {
      const restored = restoreSnapshot(pending.snapshot.id);
      if (restored) { protectCurrentState(state); dispatch({ type: 'replace', value: restored }); setSnapshots(listSnapshots()); setToast('快照已恢复，恢复前数据已保护'); }
      else setToast('该快照内容无效，无法恢复');
    } else {
      deleteSnapshot(pending.snapshot.id); setSnapshots(listSnapshots()); setToast('快照已删除');
    }
    setPending(null);
  }

  async function importFile(file?: File) {
    if (!file) return;
    const imported = importArchive(await readFileAsText(file));
    if (!imported.ok) { setToast(`存档导入失败：${imported.reason}`); if (fileInput.current) fileInput.current.value = ''; return; }
    protectCurrentState(state);
    saveSnapshot(imported.state, `导入存档 ${new Date().toLocaleString('zh-CN', { hour12: false })}`);
    dispatch({ type: 'replace', value: imported.state }); setToast('存档已导入并恢复，原状态已自动保护');
    if (fileInput.current) fileInput.current.value = '';
  }

  function rename(id: string) {
    renameSnapshot(id, editingName); setSnapshots(listSnapshots()); setEditingId(null); setToast('快照名称已更新');
  }

  return <div className="archive-control">
    <button className="button button-secondary" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>手动存档⌄</button>
    {menuOpen && <div className="archive-menu" role="menu"><button role="menuitem" onClick={startSave}>保存快照</button><button role="menuitem" onClick={startManage}>管理快照</button><button role="menuitem" onClick={() => { saveTextFile('ayundong_archive.json', exportArchive(state), 'application/json;charset=utf-8'); setMenuOpen(false); setToast('JSON 存档文件已导出'); }}>导出存档文件</button><button role="menuitem" onClick={() => { setMenuOpen(false); fileInput.current?.click(); }}>导入存档文件</button></div>}
    <input ref={fileInput} className="visually-hidden" type="file" accept=".json,application/json" aria-label="导入 JSON 存档" onChange={(e) => void importFile(e.target.files?.[0])}/>
    {saveOpen && <Modal title="保存快照" onClose={() => setSaveOpen(false)}><p className="modal-copy">快照包含赛事、摄影师、测算参数和已编辑的话术。</p><label className="archive-field">快照名称<input aria-label="快照名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus/></label><div className="modal-actions"><button className="button button-secondary" onClick={() => setSaveOpen(false)}>取消</button><button className="button button-primary" onClick={commitSave}>保存快照</button></div></Modal>}
    {manageOpen && <Modal title="管理快照" onClose={() => setManageOpen(false)}><div className="snapshot-list">{snapshots.length ? snapshots.map((snapshot) => <div className="snapshot-row" key={snapshot.id}><div className="snapshot-info">{editingId === snapshot.id ? <input aria-label="重命名快照" value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus/> : <b>{snapshot.name}</b>}<span>{new Date(snapshot.createdAt).toLocaleString('zh-CN', { hour12: false })} · {snapshot.summary.eventCount} 场赛事 · {snapshot.summary.photographerCount} 名摄影师</span></div><div className="snapshot-actions">{editingId === snapshot.id ? <button onClick={() => rename(snapshot.id)}>保存</button> : <button onClick={() => { setEditingId(snapshot.id); setEditingName(snapshot.name); }}>重命名</button>}<button onClick={() => setPending({ kind: 'restore', snapshot })}>恢复</button><button className="snapshot-delete" onClick={() => setPending({ kind: 'delete', snapshot })}>删除</button></div></div>) : <div className="snapshot-empty">还没有快照。使用“保存快照”创建一份可恢复的本机存档。</div>}</div></Modal>}
    {pending && <ConfirmDialog title={pending.kind === 'restore' ? '恢复这份快照？' : '删除这份快照？'} message={pending.kind === 'restore' ? `将恢复“${pending.snapshot.name}”。系统会先自动创建“恢复前快照”。` : `删除“${pending.snapshot.name}”后无法再从快照列表恢复。`} confirmLabel={pending.kind === 'restore' ? '确认恢复' : '确认删除'} onCancel={() => setPending(null)} onConfirm={confirmPending}/>}
    <Toast message={toast} onDone={() => setToast(null)}/>
  </div>;
}
