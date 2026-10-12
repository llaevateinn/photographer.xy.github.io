import { useState } from 'react';
import { useAppState } from '../state/AppState';
import { downloadCsv, stringifyCsv } from '../lib/csv';
import { Badge, EmptyState, Toast } from '../components/ui';

export default function ActivationPage() {
  const { activations, dispatch } = useAppState();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function copyScript(id: string, script: string) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(script);
      else {
        const field = document.createElement('textarea'); field.value = script; field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.appendChild(field); field.select(); const success = document.execCommand('copy'); field.remove();
        if (!success) throw new Error('clipboard unavailable');
      }
      setCopied(id); window.setTimeout(() => setCopied((current) => current === id ? null : current), 1500);
    } catch { setToast('复制失败，请检查浏览器剪贴板权限'); }
  }

  function download() {
    const rows = activations.map((row) => ({
      rank: row.rank, photographer_id: row.photographer.photographer_id, home_city: row.photographer.home_city,
      last_active_days: row.photographer.last_active_days, rating: row.photographer.rating,
      expected_pay_low: row.payLow, expected_pay_high: row.payHigh, script: row.script,
    }));
    downloadCsv('activation_list.csv', stringifyCsv(rows)); setToast('activation_list.csv 已下载');
  }

  return <div className="activation-page">
    <div className="results-heading"><div><h2>本周优先联系名单 <Badge tone="blue">Top {activations.length}</Badge></h2><span>可接单且评分 ≥3.5 · 按沉睡天数降序 · 已排较少者优先展示</span></div><button className="button button-primary" onClick={download}>下载 activation_list.csv ↓</button></div>
    {activations.length ? <div className="activation-list"><div className="activation-columns"><span>排名</span><span>摄影师</span><span>常驻城市</span><span>沉睡天数</span><span>评分</span><span>召回话术</span></div>{activations.map((row) => {
      const id = row.photographer.photographer_id;
      const dormantTone = row.photographer.last_active_days >= 50 ? 'dormant-hot' : row.photographer.last_active_days >= 30 ? 'dormant-warm' : 'dormant-cool';
      return <section className="activation-item" key={id}><button className={`activation-row ${expanded === id ? 'is-expanded' : ''}`} aria-expanded={expanded === id} onClick={() => setExpanded(expanded === id ? null : id)}><span className="rank-pill">{String(row.rank).padStart(2, '0')}</span><b>{id}</b><span>{row.photographer.home_city}</span><span className={`dormant-days ${dormantTone}`}>{row.photographer.last_active_days} 天</span><span className="rating-score">★ {row.photographer.rating.toFixed(1)}</span><span className="expand-prompt">{expanded === id ? '收起话术⌃' : '查看话术⌄'}</span></button>
        {expanded === id && <div className="script-card"><div className="script-card-head"><div><b>专属召回话术</b><small>可直接编辑 · 内容随输入自动保存到本机</small></div><Badge tone="green">¥{row.payLow}–¥{row.payHigh}</Badge></div><textarea aria-label={`${id} 召回话术`} value={row.script} onChange={(event) => dispatch({ type: 'script', id, value: event.target.value })}/><div className="script-card-footer"><small>报酬依据：该摄影师单场报价 ¥{row.photographer.price_per_event}，上下浮动 10%；赛事按同城优先匹配。</small><button className="button button-primary copy-button" onClick={() => void copyScript(id, row.script)}>{copied === id ? '已复制 ✓' : '复制话术'}</button></div></div>}
      </section>;
    })}</div> : <EmptyState title="暂无符合条件的摄影师" detail="需要可接单且评分不低于 3.5 的摄影师，数据更新后会自动刷新名单。"/>}
    <Toast message={toast} onDone={() => setToast(null)}/>
  </div>;
}
