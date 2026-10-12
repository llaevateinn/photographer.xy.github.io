import { useState } from 'react';
import type { RiskLevel, TabId } from '../types';
import { useAppState } from '../state/AppState';
import { Badge, EmptyState } from '../components/ui';

const filters: ('全部' | RiskLevel)[] = ['全部', '严重', '警告', '提示'];
const tones: Record<RiskLevel, 'red' | 'orange' | 'blue'> = { 严重: 'red', 警告: 'orange', 提示: 'blue' };

export default function RiskPage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { risks } = useAppState();
  const [filter, setFilter] = useState<(typeof filters)[number]>('全部');
  const visible = filter === '全部' ? risks : risks.filter((risk) => risk.level === filter);
  const summary = ['严重', '警告', '提示'].map((level) => ({ level, count: risks.filter((risk) => risk.level === level).length }));

  return <div className="risk-page">
    <div className="risk-summary">{summary.map(({ level, count }) => <div key={level}><span className={`risk-summary-dot risk-${tones[level as RiskLevel]}`}/><span>{level}</span><b>{count}</b></div>)}</div>
    <div className="risk-toolbar"><div className="risk-filters" role="group" aria-label="风险级别筛选">{filters.map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}<small>{item === '全部' ? risks.length : risks.filter((risk) => risk.level === item).length}</small></button>)}</div><span>全链路自动扫描 · 数据与参数变化后即时更新</span></div>
    {visible.length === 1 && visible[0].id === 'all-clear' ? <div className="all-clear"><span>✓</span><h2>一切正常</h2><p>当前数据未发现供给、成本、评分或档期风险。</p></div> : visible.length ? <div className="risk-list">{visible.map((risk) => <article className={`risk-card risk-card-${tones[risk.level]}`} key={risk.id} aria-label={`${risk.level}：${risk.title}`}><div className="risk-colorbar"/><div className="risk-card-content"><div className="risk-card-heading"><Badge tone={tones[risk.level]}>{risk.level}</Badge><h3>{risk.title}</h3><span>{risk.id.startsWith('supply-') ? '供给与需求' : risk.tab}</span></div><p className="risk-description">{risk.description}</p><div className="risk-meta"><div><small>涉及对象</small><span>{risk.objects}</span></div><div><small>建议动作</small><span>{risk.action}</span></div></div></div><button className="risk-go" onClick={() => onNavigate(risk.tab)}>去看看 <span>→</span></button></article>)}</div> : <EmptyState title="没有此级别的风险" detail="切换筛选级别可查看其他风险提示。"/>}
  </div>;
}
