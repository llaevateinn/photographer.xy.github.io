import { Fragment, useState } from 'react';
import { useAppState } from '../state/AppState';
import { DEFAULT_PARAMS } from '../data/builtin';
import { downloadCsv, stringifyCsv } from '../lib/csv';
import { Badge, Toast } from '../components/ui';

const controls = [
  { key: 'coverage_rate', title: '覆盖率', min: 0.5, max: 1, step: 0.01, format: (v: number) => `${Math.round(v * 100)}%`, reason: '目标是在参赛者中找到至少该比例人群的照片。' },
  { key: 'photos_per_covered_user', title: '人均有效照片', min: 1, max: 8, step: 1, format: (v: number) => `${v} 张`, reason: '每位成功覆盖的参赛者需要的清晰可用照片数。' },
  { key: 'usable_rate', title: '精品率', min: 0.3, max: 0.9, step: 0.01, format: (v: number) => `${Math.round(v * 100)}%`, reason: '拍摄原片中最终可交付的比例。' },
  { key: 'raw_photos_per_hour', title: '单人每小时原片', min: 200, max: 1500, step: 50, format: (v: number) => `${v} 张`, reason: '单名摄影师每小时拍摄的原片数量假设。' },
  { key: 'night_factor', title: '夜跑修正', min: 0.5, max: 1, step: 0.01, format: (v: number) => `×${v.toFixed(2)}`, reason: '夜间拍摄质量与命中率下降后的产能折减。' },
  { key: 'high_difficulty_factor', title: '难度 ≥4 修正', min: 0.5, max: 1, step: 0.01, format: (v: number) => `×${v.toFixed(2)}`, reason: '高难度赛事机位复杂、作业损耗增加。' },
  { key: 'marathon_factor', title: '全马修正', min: 0.5, max: 1, step: 0.01, format: (v: number) => `×${v.toFixed(2)}`, reason: '42km 赛道更长，覆盖难度更高。' },
] as const;

export default function StaffingPage() {
  const { state, dispatch, staffing } = useAppState();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const modified = Object.keys(DEFAULT_PARAMS).some((key) => state.params[key as keyof typeof DEFAULT_PARAMS] !== DEFAULT_PARAMS[key as keyof typeof DEFAULT_PARAMS]);

  function download() {
    const rows = staffing.map(({ event, recommended, baseline, estimatedCost, budget, overBudget }) => ({
      event_id: event.event_id, city: event.city, event_date: event.event_date, recommended_photographers: recommended,
      baseline_photographers: baseline, estimated_cost: estimatedCost, budget_limit: budget, over_budget: overBudget ? 'yes' : 'no',
    }));
    downloadCsv('staffing_plan.csv', stringifyCsv(rows)); setToast('staffing_plan.csv 已下载');
  }

  return <div className="staffing-page">
    <div className="staffing-layout"><aside className="parameter-panel"><div className="parameter-heading"><div><h2>测算参数</h2><span>拖动滑块实时查看人数变化</span></div>{modified && <Badge tone="orange">已修改</Badge>}</div>
      {controls.map((control) => {
        const key = control.key as keyof typeof state.params;
        const value = state.params[key];
        return <label className="parameter-control" key={control.key}><span><b>{control.title}</b><strong>{control.format(value)}</strong></span><input aria-label={control.title} type="range" min={control.min} max={control.max} step={control.step} value={value} onChange={(e) => dispatch({ type: 'params', value: { ...state.params, [control.key]: Number(e.target.value) } })}/><small>{control.reason}</small></label>;
      })}
      <div className="assumption-note"><b>预算口径</b><span>推荐人数 × ¥700 / 场</span><small>此版本按固定单人预算估算，与摄影师实际报价排班成本分开展示。</small></div>
      <button className="button button-secondary reset-params" onClick={() => dispatch({ type: 'params', value: { ...DEFAULT_PARAMS } })}>恢复默认参数</button>
    </aside>
    <div className="results-panel"><div className="results-heading"><div><h2>摄影师需求测算</h2><span>点击赛事行，查看代入数字的完整公式</span></div><button className="button button-primary" onClick={download}>下载 staffing_plan.csv ↓</button></div>
      <div className="table-scroll staffing-table"><table><thead><tr><th>赛事</th><th>城市 / 日期</th><th>推荐人数</th><th>预计成本</th><th>预算上限</th><th>预算状态</th></tr></thead><tbody>{staffing.map((row) => {
        const difference = row.recommended - row.baseline;
        return <Fragment key={row.event.event_id}><tr className="expandable-row" onClick={() => setExpanded(expanded === row.event.event_id ? null : row.event.event_id)} aria-expanded={expanded === row.event.event_id}>
          <td><b>{row.event.event_id}</b><span className="cell-sub">{row.event.participants.toLocaleString()} 人 · {row.event.course_km} km</span></td><td>{row.event.city}<span className="cell-sub">{row.event.event_date}</span></td>
          <td className="number-cell"><span className="people-compare">{row.baseline} <i>→</i> <b>{row.recommended}</b></span>{difference !== 0 && <sup className={difference > 0 ? 'delta-up' : 'delta-down'}>{difference > 0 ? '+' : ''}{difference}</sup>}</td>
          <td className="number-cell">¥{row.estimatedCost.toLocaleString()}</td><td className="number-cell">¥{row.budget.toLocaleString()}</td><td><Badge tone={row.overBudget ? 'red' : 'green'}>{row.overBudget ? '超支' : '预算内'}</Badge></td>
        </tr>{expanded === row.event.event_id && <tr className="formula-row"><td colSpan={6}><div className="formula-box"><div><b>计算过程 · {row.event.event_id}</b><Badge tone="blue">推荐 {row.recommended} 人</Badge></div>{row.calculation.map((step, index) => <p key={index}><span>{String(index + 1).padStart(2, '0')}</span>{step}</p>)}<small>适用修正项：夜跑 ×0.85、难度 ≥4 ×0.90、全马 42km ×0.95。各项仅在赛事符合条件时参与连乘。</small></div></td></tr>}</Fragment>;
      })}</tbody></table></div>
    </div></div><Toast message={toast} onDone={() => setToast(null)}/>
  </div>;
}
