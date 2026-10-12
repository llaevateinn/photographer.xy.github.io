import type { AppState, Snapshot } from '../types';
import { SNAPSHOTS_KEY, validateAppState } from './storage';

export function listSnapshots(): Snapshot[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) ?? '[]'); return Array.isArray(value) ? value as Snapshot[] : []; }
  catch { return []; }
}

function writeSnapshots(snapshots: Snapshot[]): void { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots)); }

export function saveSnapshot(state: AppState, name: string, now = new Date()): Snapshot {
  const snapshot: Snapshot = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || '未命名存档', createdAt: now.toISOString(),
    summary: { eventCount: state.events.length, photographerCount: state.photographers.length }, payload: structuredClone(state),
  };
  writeSnapshots([snapshot, ...listSnapshots()]);
  return snapshot;
}

export function protectCurrentState(state: AppState): Snapshot { return saveSnapshot(state, '恢复前快照'); }

export function restoreSnapshot(id: string): AppState | null {
  const snapshot = listSnapshots().find((item) => item.id === id);
  if (!snapshot || !validateAppState(snapshot.payload)) return null;
  return structuredClone(snapshot.payload);
}

export function renameSnapshot(id: string, name: string): boolean {
  const snapshots = listSnapshots(); const item = snapshots.find((x) => x.id === id);
  if (!item) return false;
  item.name = name.trim() || item.name; writeSnapshots(snapshots); return true;
}

export function deleteSnapshot(id: string): boolean {
  const snapshots = listSnapshots(); const next = snapshots.filter((x) => x.id !== id);
  if (next.length === snapshots.length) return false;
  writeSnapshots(next); return true;
}

export function exportArchive(state: AppState): string { return JSON.stringify({ format: 'ayd-archive', version: 1, exportedAt: new Date().toISOString(), state }, null, 2); }

export function importArchive(text: string): { ok: true; state: AppState } | { ok: false; reason: string } {
  try {
    const value = JSON.parse(text) as { format?: unknown; version?: unknown; state?: unknown };
    if (value?.format !== 'ayd-archive' || value.version !== 1 || !validateAppState(value.state)) return { ok: false, reason: '存档格式或版本无效' };
    return { ok: true, state: structuredClone(value.state) };
  } catch { return { ok: false, reason: 'JSON 文件无法解析' }; }
}
