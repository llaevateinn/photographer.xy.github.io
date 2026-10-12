import { useState } from 'react';
import { AppStateProvider, useAppState } from './state/AppState';
import type { TabId } from './types';
import { Badge } from './components/ui';
import DataPage from './pages/DataPage';
import StaffingPage from './pages/StaffingPage';
import AssignmentPage from './pages/AssignmentPage';
import ActivationPage from './pages/ActivationPage';
import RiskPage from './pages/RiskPage';
import ArchiveControl from './components/ArchiveControl';

const tabs: TabId[] = ['数据', '需求测算', '排班建议', '激活召回', '风险提示'];

function Workspace() {
  const [active, setActive] = useState<TabId>('数据');
  const { state, savedAt, staffing, assignments, risks } = useAppState();
  const budgetTotal = staffing.reduce((sum, row) => sum + row.budget, 0);
  const scheduledTotal = assignments.reduce((sum, row) => sum + row.cost, 0);
  const go = (tab: TabId) => setActive(tab);
  const whenSaved = savedAt ? new Date(savedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '等待首次保存';
  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">爱</div><div><strong>爱云动</strong><span className="brand-subtitle">赛事摄影调度 Demo</span></div><div className="topbar-spacer"/><span className="save-state"><i/>自动保存 · {whenSaved}</span><ArchiveControl/></header>
    <section className="overview" aria-label="运营概览">
      <div className="overview-card"><strong>{state.events.length}</strong><span>赛事</span><small>场</small></div>
      <div className="overview-card"><strong>{state.photographers.length}</strong><span>摄影师</span><small>名</small></div>
      <div className="overview-card overview-cost"><strong className={scheduledTotal > budgetTotal ? 'text-red' : ''}>¥{scheduledTotal.toLocaleString()}</strong><span>预计排班成本</span><small>/ 预算 ¥{budgetTotal.toLocaleString()}</small></div>
      <button className="overview-card overview-risk" onClick={() => go('风险提示')}><strong className={risks.some((risk) => risk.level === '严重') ? 'text-red' : ''}>{risks.length}</strong><span>风险提示</span><small>条</small></button>
    </section>
    <nav className="tabs" aria-label="主导航" role="tablist">{tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} className={`tab ${active === tab ? 'active' : ''}`} onClick={() => setActive(tab)}>{tab}</button>)}</nav>
    <section className="content-panel" role="tabpanel" aria-label={`${active}内容`}><div className="page-heading"><div><p className="eyebrow">AYUNDONG · OPERATIONS</p><h1>{active}</h1></div><div className="heading-status"><Badge tone="green">自动级联重算</Badge><span>工作台</span></div></div>{active === '数据' ? <DataPage/> : active === '需求测算' ? <StaffingPage/> : active === '排班建议' ? <AssignmentPage/> : active === '激活召回' ? <ActivationPage/> : <RiskPage onNavigate={go}/>}</section>
    <footer className="footer-note">本地演示环境 · 数据仅保存在当前浏览器 · 离线可用</footer>
  </main>;
}

export default function App() { return <AppStateProvider><Workspace/></AppStateProvider>; }
