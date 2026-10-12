import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILTIN_EVENTS, BUILTIN_PHOTOGRAPHERS, DEFAULT_PARAMS, makeDefaultState } from '../data/builtin';
import { parseEventsCsv, parsePhotographersCsv, stringifyCsv } from './csv';
import { deleteSnapshot, exportArchive, importArchive, listSnapshots, protectCurrentState, renameSnapshot, restoreSnapshot, saveSnapshot } from './archive';
import { createDebouncedSave, loadState, saveState } from './storage';

const eventCsv = 'event_id,city,event_date,participants,course_km,time_window_hours,night_race,difficulty\nE1,广州,2026-10-01,1000,10,2,no,3';
const photoCsv = 'photographer_id,home_city,price_per_event,rating,last_active_days,skill_tags,available\nP1,广州,600,4.2,10,跑步|夜拍,yes';

describe('M1 built-in data and CSV validation', () => {
  it('provides the six PRD events, sixteen photographers and default parameters', () => {
    expect(BUILTIN_EVENTS).toHaveLength(6);
    expect(BUILTIN_EVENTS[5].event_id).toBe('E006');
    expect(BUILTIN_PHOTOGRAPHERS).toHaveLength(16);
    expect(BUILTIN_PHOTOGRAPHERS.filter((p) => p.rating < 3.5).length).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_PARAMS).toMatchObject({ coverage_rate: 0.85, usable_rate: 0.6, raw_photos_per_hour: 500 });
  });

  it('parses quoted CSV fields and round trips tags', () => {
    const parsed = parseEventsCsv(eventCsv.replace('广州', '"广州"'));
    expect(parsed.ok).toBe(true);
    expect(parsed.rows[0].participants).toBe(1000);
    const photographers = parsePhotographersCsv(photoCsv);
    expect(photographers.rows[0].skill_tags).toEqual(['跑步', '夜拍']);
    expect(parsePhotographersCsv(stringifyCsv(photographers.rows))).toMatchObject({ ok: true });
  });

  it('reports missing headers, exact data row and numeric/range problems; rejects empty tables', () => {
    const bad = parseEventsCsv('event_id,city,participants\nE1,广州,abc');
    expect(bad.ok).toBe(false);
    expect(bad.issues).toContainEqual({ row: 1, field: 'event_date', reason: '缺少必需表头' });
    expect(bad.issues).toContainEqual({ row: 2, field: 'participants', reason: '必须为合法数字' });
    expect(parseEventsCsv('event_id,city,event_date,participants,course_km,time_window_hours,night_race,difficulty').issues[0].reason).toBe('数据表不能为空');
    expect(parseEventsCsv(eventCsv.replace('2026-10-01', '2026-02-30')).issues.some((issue) => issue.field === 'event_date')).toBe(true);
    expect(parseEventsCsv(`${eventCsv}\nE1,深圳,2026-10-02,100,5,1,no,2`).issues.some((issue) => issue.reason.startsWith('ID 重复'))).toBe(true);
  });
});

describe('M1 persistence and archive functions', () => {
  beforeEach(() => localStorage.clear());

  it('loads defaults, writes current state and debounces automatic saves', () => {
    const state = makeDefaultState();
    expect(loadState().events).toHaveLength(6);
    saveState(state);
    expect(loadState().photographers).toHaveLength(16);
    vi.useFakeTimers();
    const onSaved = vi.fn(); const schedule = createDebouncedSave(1000, onSaved);
    schedule({ ...state, events: [] }); schedule(state);
    vi.advanceTimersByTime(999);
    expect(onSaved).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSaved).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('saves, protects, restores, renames, deletes and imports/exports snapshots', () => {
    const state = makeDefaultState();
    const snapshot = saveSnapshot(state, '测试存档');
    expect(listSnapshots()).toHaveLength(1);
    expect(restoreSnapshot(snapshot.id)?.events).toHaveLength(6);
    expect(renameSnapshot(snapshot.id, '新名字')).toBe(true);
    protectCurrentState(state);
    expect(listSnapshots().map((x) => x.name)).toContain('恢复前快照');
    const archived = importArchive(exportArchive(state));
    expect(archived.ok).toBe(true);
    expect(importArchive('{broken').ok).toBe(false);
    expect(deleteSnapshot(snapshot.id)).toBe(true);
  });
});
