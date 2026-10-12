import Papa from 'papaparse';
import type { CsvIssue, CsvResult, EventRecord, Photographer } from '../types';

type FieldSpec = { name: string; numeric?: boolean; integer?: boolean; min?: number; max?: number; choice?: string[]; split?: boolean };
const eventSpec: FieldSpec[] = [
  { name: 'event_id' }, { name: 'city' }, { name: 'event_date' },
  { name: 'participants', numeric: true, integer: true, min: 1 }, { name: 'course_km', numeric: true, min: 1 },
  { name: 'time_window_hours', numeric: true, min: 0.1 }, { name: 'night_race', choice: ['yes', 'no'] },
  { name: 'difficulty', numeric: true, integer: true, min: 1, max: 5 },
];
const photographerSpec: FieldSpec[] = [
  { name: 'photographer_id' }, { name: 'home_city' }, { name: 'price_per_event', numeric: true, min: 0 },
  { name: 'rating', numeric: true, min: 0, max: 5 }, { name: 'last_active_days', numeric: true, integer: true, min: 0 },
  { name: 'skill_tags', split: true }, { name: 'available', choice: ['yes', 'no'] },
];

export type CsvDataset = 'events' | 'photographers';

export function detectCsvDataset(text: string): CsvDataset | null {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), {
    header: true, preview: 1, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim(),
  });
  const headers = new Set(parsed.meta.fields ?? []);
  if (headers.has('event_id') && !headers.has('photographer_id')) return 'events';
  if (headers.has('photographer_id') && !headers.has('event_id')) return 'photographers';
  return null;
}

function parseTable<T>(text: string, spec: FieldSpec[], convert: (cells: Record<string, string>) => T): CsvResult<T> {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() });
  const issues: CsvIssue[] = [];
  if (parsed.errors.length) {
    for (const error of parsed.errors) issues.push({ row: (error.row ?? 0) + 2, field: 'CSV', reason: error.message });
  }
  const headers = parsed.meta.fields ?? [];
  for (const field of spec) if (!headers.includes(field.name)) issues.push({ row: 1, field: field.name, reason: '缺少必需表头' });
  if (!parsed.data.length) issues.push({ row: 0, field: 'CSV', reason: '数据表不能为空' });

  const rows: T[] = [];
  parsed.data.forEach((raw, index) => {
    const row = index + 2;
    const cells: Record<string, string> = {};
    for (const field of spec) {
      const value = String(raw[field.name] ?? '').trim();
      cells[field.name] = value;
      if (!value) { issues.push({ row, field: field.name, reason: '不能为空' }); continue; }
      if (field.numeric) {
        const n = Number(value);
        if (!Number.isFinite(n)) issues.push({ row, field: field.name, reason: '必须为合法数字' });
        else if (field.integer && !Number.isInteger(n)) issues.push({ row, field: field.name, reason: '必须为整数' });
        else if (field.min !== undefined && n < field.min) issues.push({ row, field: field.name, reason: `不能小于 ${field.min}` });
        else if (field.max !== undefined && n > field.max) issues.push({ row, field: field.name, reason: `不能大于 ${field.max}` });
      }
      if (field.choice && !field.choice.includes(value)) issues.push({ row, field: field.name, reason: `只能是 ${field.choice.join(' 或 ')}` });
      if (field.name === 'event_date') {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
        if (!date || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) issues.push({ row, field: field.name, reason: '必须为真实有效的 YYYY-MM-DD 日期' });
      }
    }
    rows.push(convert(cells));
  });
  const idField = spec[0].name;
  const seen = new Set<string>();
  parsed.data.forEach((raw, index) => {
    const id = String(raw[idField] ?? '').trim();
    if (id && seen.has(id)) issues.push({ row: index + 2, field: idField, reason: `ID 重复：${id}` });
    if (id) seen.add(id);
  });
  return { ok: issues.length === 0, rows: issues.length ? [] : rows, issues };
}

export function parseEventsCsv(text: string): CsvResult<EventRecord> {
  return parseTable(text, eventSpec, (r) => ({
    event_id: r.event_id, city: r.city, event_date: r.event_date, participants: Number(r.participants),
    course_km: Number(r.course_km), time_window_hours: Number(r.time_window_hours), night_race: r.night_race as 'yes' | 'no', difficulty: Number(r.difficulty),
  }));
}

export function parsePhotographersCsv(text: string): CsvResult<Photographer> {
  return parseTable(text, photographerSpec, (r) => ({
    photographer_id: r.photographer_id, home_city: r.home_city, price_per_event: Number(r.price_per_event),
    rating: Number(r.rating), last_active_days: Number(r.last_active_days), skill_tags: r.skill_tags.split(/[|/;]/).map((x) => x.trim()).filter(Boolean), available: r.available as 'yes' | 'no',
  }));
}

export function stringifyCsv<T extends object>(rows: T[], columns?: (keyof T)[]): string {
  if (!rows.length) return '';
  const fields = columns ? columns.map(String) : Object.keys(rows[0]);
  return '\uFEFF' + Papa.unparse({ fields, data: rows.map((row) => {
    const record = row as Record<string, unknown>;
    return fields.map((key) => Array.isArray(record[key]) ? (record[key] as unknown[]).join('|') : record[key]);
  }) });
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file, 'UTF-8');
  });
}
