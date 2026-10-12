import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useAppState } from '../state/AppState';
import type { CsvIssue, EventRecord, Photographer } from '../types';
import { parseEventsCsv, parsePhotographersCsv, stringifyCsv, downloadCsv, readFileAsText } from '../lib/csv';
import { makeDefaultState } from '../data/builtin';
import { ConfirmDialog, EmptyState, Modal, Toast } from '../components/ui';
import { protectCurrentState } from '../lib/archive';

type Dataset = 'events' | 'photographers';

export default function DataPage() {
  const { state, dispatch } = useAppState();
  const [dataset, setDataset] = useState<Dataset>('events');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [confirmDefault, setConfirmDefault] = useState(false);
  const [issues, setIssues] = useState<CsvIssue[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sort, setSort] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const columns: { key: string; label: string; value: (row: Record<string, unknown>) => string }[] = dataset === 'events'
    ? [
      { key: 'event_id', label: '赛事 ID', value: (r) => String(r.event_id) }, { key: 'city', label: '城市', value: (r) => String(r.city) },
      { key: 'event_date', label: '日期', value: (r) => String(r.event_date) }, { key: 'participants', label: '参赛人数', value: (r) => Number(r.participants).toLocaleString() },
      { key: 'course_km', label: '赛道 km', value: (r) => String(r.course_km) }, { key: 'time_window_hours', label: '拍摄时长', value: (r) => `${r.time_window_hours} 小时` },
      { key: 'night_race', label: '夜跑', value: (r) => r.night_race === 'yes' ? '是' : '否' }, { key: 'difficulty', label: '难度', value: (r) => String(r.difficulty) },
    ]
    : [
      { key: 'photographer_id', label: '摄影师 ID', value: (r) => String(r.photographer_id) }, { key: 'home_city', label: '常驻城市', value: (r) => String(r.home_city) },
      { key: 'price_per_event', label: '单场报价', value: (r) => `¥${r.price_per_event}` }, { key: 'rating', label: '评分', value: (r) => Number(r.rating).toFixed(1) },
      { key: 'last_active_days', label: '沉睡天数', value: (r) => `${r.last_active_days} 天` }, { key: 'skill_tags', label: '技能标签', value: (r) => (r.skill_tags as string[]).join(' / ') },
      { key: 'available', label: '可接单', value: (r) => r.available === 'yes' ? '可接单' : '暂不可接' },
    ];
  const rows = (dataset === 'events' ? state.events : state.photographers) as unknown as Record<string, unknown>[];
  const sortedRows = sort ? [...rows].sort((left, right) => {
    const a = left[sort.key]; const b = right[sort.key];
    const comparison = typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(Array.isArray(a) ? a.join(' / ') : a ?? '').localeCompare(String(Array.isArray(b) ? b.join(' / ') : b ?? ''), 'zh-CN', { numeric: true });
    return sort.direction === 'ascending' ? comparison : -comparison;
  }) : rows;

  function toggleSort(key: string) {
    setSort((current) => ({ key, direction: current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending' }));
  }

  const addFields = dataset === 'events'
    ? [
      { key: 'event_id', label: '赛事 ID' }, { key: 'city', label: '城市' }, { key: 'event_date', label: '日期', type: 'date' },
      { key: 'participants', label: '参赛人数', type: 'number', min: '1', step: '1' }, { key: 'course_km', label: '赛道 km', type: 'number', min: '1', step: '0.1' },
      { key: 'time_window_hours', label: '拍摄时长', type: 'number', min: '0.1', step: '0.1' }, { key: 'difficulty', label: '难度', type: 'number', min: '1', max: '5', step: '1' },
    ]
    : [
      { key: 'photographer_id', label: '摄影师 ID' }, { key: 'home_city', label: '常驻城市' }, { key: 'price_per_event', label: '单场报价', type: 'number', min: '0', step: '1' },
      { key: 'rating', label: '评分', type: 'number', min: '0', max: '5', step: '0.1' }, { key: 'last_active_days', label: '沉睡天数', type: 'number', min: '0', step: '1' },
      { key: 'skill_tags', label: '技能标签' },
    ];

  function openAddForm() {
    setAddDraft(Object.fromEntries(addFields.map((field) => [field.key, ''])));
    setAddError(''); setAddOpen(true);
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAddError('');
    const csv = stringifyCsv([addDraft]);
    const result = dataset === 'events' ? parseEventsCsv(csv) : parsePhotographersCsv(csv);
    if (!result.ok) { setAddError(result.issues.map((issue) => `${issue.field}：${issue.reason}`).join('；')); return; }
    if (dataset === 'events') {
      const record = result.rows[0] as EventRecord;
      if (state.events.some((row) => row.event_id === record.event_id)) { setAddError('赛事 ID 已存在，请使用唯一 ID。'); return; }
      dispatch({ type: 'events', value: [...state.events, record] });
    } else {
      const record = result.rows[0] as Photographer;
      if (state.photographers.some((row) => row.photographer_id === record.photographer_id)) { setAddError('摄影师 ID 已存在，请使用唯一 ID。'); return; }
      dispatch({ type: 'photographers', value: [...state.photographers, record] });
    }
    setAddOpen(false); setToast(`已新增${dataset === 'events' ? '赛事' : '摄影师'}，相关结果已自动重算`);
  }

  function importText(text: string) {
    const result = dataset === 'events' ? parseEventsCsv(text) : parsePhotographersCsv(text);
    if (!result.ok) { setIssues(result.issues); setToast('CSV 校验失败，现有数据未更改'); return; }
    setIssues([]);
    if (dataset === 'events') dispatch({ type: 'events', value: result.rows as never });
    else dispatch({ type: 'photographers', value: result.rows as never });
    setToast(`已替换${dataset === 'events' ? '赛事' : '摄影师'}表（${result.rows.length} 行）`);
    setPasteOpen(false); setPasteValue('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function acceptFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') { setIssues([{ row: 0, field: '文件', reason: '请选择 CSV 文件' }]); return; }
    importText(await readFileAsText(file));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false); void acceptFile(event.dataTransfer.files[0]);
  }

  function downloadCurrent() {
    if (dataset === 'events') downloadCsv('events.csv', stringifyCsv(state.events));
    else downloadCsv('photographers.csv', stringifyCsv(state.photographers));
    setToast('当前数据表已下载');
  }

  function restoreDefault() {
    const defaults = makeDefaultState();
    protectCurrentState(state);
    dispatch({ type: 'replace', value: defaults });
    setConfirmDefault(false); setIssues([]); setToast('已恢复默认数据并完成自动重算');
  }

  return <div className="data-page">
    <div className="section-toolbar"><div className="subtabs" role="tablist" aria-label="数据表类型"><button role="tab" aria-selected={dataset === 'events'} onClick={() => { setDataset('events'); setIssues([]); }}>赛事需求表 <b>{state.events.length}</b></button><button role="tab" aria-selected={dataset === 'photographers'} onClick={() => { setDataset('photographers'); setIssues([]); }}>摄影师供给表 <b>{state.photographers.length}</b></button></div><div className="button-row"><button className="button button-primary" onClick={openAddForm}>{dataset === 'events' ? '新增赛事' : '新增摄影师'}</button><button className="button button-secondary" onClick={() => fileRef.current?.click()}>上传 CSV</button><input ref={fileRef} className="visually-hidden" type="file" accept=".csv,text/csv" aria-label="上传 CSV 文件" onChange={(event) => void acceptFile(event.target.files?.[0])}/><button className="button button-secondary" onClick={() => setPasteOpen(true)}>粘贴 CSV</button><button className="button button-secondary" onClick={downloadCurrent}>下载当前表</button><button className="button button-quiet-danger" onClick={() => setConfirmDefault(true)}>恢复默认</button></div></div>
    <div className={`drop-zone ${dragging ? 'drop-zone-active' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><span className="upload-icon">↑</span><span>将 CSV 文件拖到这里，或点击 <button onClick={() => fileRef.current?.click()}>选择文件</button></span><small>CSV 表头需与当前数据字段一致；校验通过后自动重算。</small></div>
    {issues.length > 0 && <section className="validation-panel" role="alert"><div className="validation-title">CSV 校验失败 · 现有数据保持不变</div><ul>{issues.map((issue, index) => <li key={`${issue.row}-${issue.field}-${index}`}>第 {issue.row || '—'} 行 · <b>{issue.field}</b>：{issue.reason}</li>)}</ul></section>}
    <div className="table-heading"><div><h2>{dataset === 'events' ? '赛事需求表' : '摄影师供给表'}</h2><span>只读预览 · 当前生效的本地数据</span></div><span className="row-count">共 {rows.length} 行</span></div>
    {rows.length ? <div className="table-scroll"><table><thead><tr><th aria-label="序号">#</th>{columns.map((col) => <th key={col.key} aria-sort={sort?.key === col.key ? sort.direction : 'none'}><button className="sort-button" type="button" aria-label={`按${col.label}排序`} onClick={() => toggleSort(col.key)}>{col.label}<span aria-hidden="true">{sort?.key === col.key ? sort.direction === 'ascending' ? ' ↑' : ' ↓' : ' ↕'}</span></button></th>)}</tr></thead><tbody>{sortedRows.map((row, index) => <tr key={String(row[columns[0].key])}><td className="table-index">{String(index + 1).padStart(2, '0')}</td>{columns.map((col) => <td key={col.key}>{col.value(row)}</td>)}</tr>)}</tbody></table></div> : <EmptyState title="暂无数据" detail="请导入 CSV 文件或恢复默认数据。"/>}
    {pasteOpen && <Modal title={`粘贴${dataset === 'events' ? '赛事' : '摄影师'} CSV`} onClose={() => setPasteOpen(false)}><p className="modal-copy">请粘贴含完整表头的 CSV 内容。字段顺序可以调整，表头名称需保持一致。</p><pre className="csv-example">{dataset === 'events' ? 'event_id,city,event_date,participants,course_km,time_window_hours,night_race,difficulty\nE001,广州,2026-11-01,5000,42,4,no,4' : 'photographer_id,home_city,price_per_event,rating,last_active_days,skill_tags,available\nP001,广州,700,4.8,45,跑步|冲线|人像,yes'}</pre><textarea aria-label="CSV 内容" value={pasteValue} onChange={(e) => setPasteValue(e.target.value)} placeholder="在此粘贴 CSV 内容"/><div className="modal-actions"><button className="button button-secondary" onClick={() => setPasteOpen(false)}>取消</button><button className="button button-primary" onClick={() => importText(pasteValue)}>校验并替换</button></div></Modal>}
    {addOpen && <Modal title={`新增${dataset === 'events' ? '赛事' : '摄影师'}`} onClose={() => setAddOpen(false)}><form className="record-form" onSubmit={addRecord}><div className="record-form-grid">{addFields.map((field) => <label key={field.key}>{field.label}<input aria-label={field.label} type={field.type ?? 'text'} min={field.min} max={field.max} step={field.step} required value={addDraft[field.key] ?? ''} onChange={(e) => setAddDraft({ ...addDraft, [field.key]: e.target.value })}/></label>)}<label>{dataset === 'events' ? '夜跑' : '可接单'}<select aria-label={dataset === 'events' ? '夜跑' : '可接单'} required value={addDraft[dataset === 'events' ? 'night_race' : 'available'] ?? ''} onChange={(e) => setAddDraft({ ...addDraft, [dataset === 'events' ? 'night_race' : 'available']: e.target.value })}><option value="">请选择</option><option value="yes">是 / 可接单</option><option value="no">否 / 暂不可接</option></select></label></div>{dataset === 'photographers' && <small className="record-form-hint">技能标签可用竖线、斜线或分号分隔。</small>}{addError && <p className="record-form-error" role="alert">{addError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setAddOpen(false)}>取消</button><button type="submit" className="button button-primary">保存{dataset === 'events' ? '赛事' : '摄影师'}</button></div></form></Modal>}
    {confirmDefault && <ConfirmDialog title="恢复全部默认数据？" message="赛事、摄影师、测算参数与召回话术将恢复为内置示例，并自动级联重算。系统会先创建一份“恢复前快照”。" confirmLabel="确认恢复" onCancel={() => setConfirmDefault(false)} onConfirm={restoreDefault}/>}
    <Toast message={toast} onDone={() => setToast(null)}/>
  </div>;
}
