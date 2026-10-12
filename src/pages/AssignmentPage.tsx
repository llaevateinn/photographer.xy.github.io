import { useState } from 'react';
import { useAppState } from '../state/AppState';
import { downloadCsv, stringifyCsv } from '../lib/csv';
import { Badge, EmptyState, ProgressBar, Toast } from '../components/ui';

export default function AssignmentPage() {
  const { assignments } = useAppState();
  const [toast, setToast] = useState<string | null>(null);
  const totalPeople = assignments.reduce((sum, row) => sum + row.assignments.length, 0);
  const totalCost = assignments.reduce((sum, row) => sum + row.cost, 0);
  const crossCityCount = assignments.reduce((sum, row) => sum + row.assignments.filter((a) => a.crossCity).length, 0);

  function download() {
    const rows = assignments.flatMap((event) => event.assignments.map((a) => ({
      event_id: a.event_id, photographer_id: a.photographer_id, home_city: a.home_city, rating: a.rating,
      last_active_days: a.last_active_days, skill_tags: a.skill_tags.join('|'), price_per_event: a.price_per_event,
      cross_city: a.crossCity ? 'yes' : 'no', reason: a.reason,
    })));
    downloadCsv('assignments.csv', stringifyCsv(rows)); setToast('assignments.csv 已下载');
  }

  return <div className="assignment-page">
    <div className="results-heading"><div><h2>赛事排班方案</h2><span>按赛事日期排序 · 已应用可接单、评分和档期硬约束</span></div><button className="button button-primary" onClick={download}>下载 assignments.csv ↓</button></div>
    {assignments.length === 0 ? <EmptyState title="暂无赛事" detail="导入赛事数据后，系统会自动生成排班建议。"/> : <div className="event-cards">{assignments.map((schedule) => {
      const overBudget = schedule.cost > schedule.budget;
      return <article className="event-card" key={schedule.event.event_id} aria-label={`${schedule.event.event_id} 排班`}>
        <header className="event-card-header"><div className="event-title"><div className="event-title-main"><h3>{schedule.event.event_id}</h3><Badge tone={schedule.event.night_race === 'yes' ? 'blue' : 'gray'}>{schedule.event.night_race === 'yes' ? '夜跑' : '日间'}</Badge><Badge tone={schedule.event.difficulty >= 4 ? 'orange' : 'gray'}>难度 {schedule.event.difficulty}</Badge></div><p>{schedule.event.city} · {schedule.event.event_date} · {schedule.event.course_km} km</p></div><div className="event-progress"><div><span>人员到位</span><strong className={schedule.shortage ? 'shortage-number' : ''}>{schedule.assignments.length} / {schedule.recommended}</strong></div><ProgressBar value={schedule.assignments.length} max={schedule.recommended} tone={schedule.shortage ? 'orange' : 'blue'} label={`${schedule.assignments.length} / ${schedule.recommended} 人`}/>{schedule.shortage > 0 && <Badge tone="orange">缺口 {schedule.shortage} 人</Badge>}</div><div className="event-progress cost-progress"><div><span>成本 / 预算</span><strong className={overBudget ? 'text-red' : ''}>¥{schedule.cost.toLocaleString()} / ¥{schedule.budget.toLocaleString()}</strong></div><ProgressBar value={schedule.cost} max={schedule.budget} tone={overBudget ? 'red' : 'blue'} label={`${schedule.budget ? Math.round(schedule.cost / schedule.budget * 100) : 0}%`}/>{overBudget && <Badge tone="red">超预算</Badge>}</div></header>
        {schedule.assignments.length ? <div className="table-scroll assignment-table"><table><thead><tr><th>摄影师</th><th>城市</th><th>评分</th><th>沉睡</th><th>技能标签</th><th>报价</th><th>选择原因</th></tr></thead><tbody>{schedule.assignments.map((a) => <tr key={a.photographer_id}><td><b>{a.photographer_id}</b></td><td><span className={`city-dot ${a.crossCity ? 'dot-cross' : 'dot-local'}`}/>{a.home_city}<span className={`city-type ${a.crossCity ? 'cross-label' : ''}`}>{a.crossCity ? '跨城' : '同城'}</span></td><td>{a.rating.toFixed(1)}</td><td>{a.last_active_days} 天</td><td><div className="skill-list">{a.skill_tags.map((tag) => <span key={tag}>{tag}</span>)}</div></td><td>¥{a.price_per_event}</td><td className="reason-cell">{a.reason}</td></tr>)}</tbody></table></div> : <EmptyState title="暂无人选可排" detail="请检查可接单人员、评分限制或调整需求参数。"/>}
      </article>;
    })}</div>}
    <div className="assignment-total"><div><span>总成本</span><b>¥{totalCost.toLocaleString()}</b></div><div><span>已排人数</span><b>{totalPeople} 人次</b></div><div><span>跨城调度</span><b className={crossCityCount ? 'cross-label' : ''}>{crossCityCount} 人次</b></div><small>以实际摄影师报价汇总 · 跨城差旅未计入报价</small></div>
    <Toast message={toast} onDone={() => setToast(null)}/>
  </div>;
}
