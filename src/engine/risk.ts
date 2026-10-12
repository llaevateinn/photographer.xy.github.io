import type { EventAssignment, EventRecord, Photographer, RiskItem, StaffingPlan } from '../types';

export function scanRisks(events: EventRecord[], photographers: Photographer[], plans: StaffingPlan[], schedules: EventAssignment[]): RiskItem[] {
  const risks: RiskItem[] = [];
  const planMap = new Map(plans.map((p) => [p.event.event_id, p]));
  const scheduleMap = new Map(schedules.map((s) => [s.event.event_id, s]));
  for (const event of events) {
    const plan = planMap.get(event.event_id); const schedule = scheduleMap.get(event.event_id);
    const eligible = photographers.filter((p) => p.available === 'yes' && !(p.rating < 3.5 && event.difficulty >= 4)).length;
    if (plan && plan.recommended > eligible) risks.push({ id: `supply-${event.event_id}`, level: '严重', title: '供给不足', description: `${event.event_id} 推荐 ${plan.recommended} 人，符合硬约束的可用人选仅 ${eligible} 人。`, objects: event.event_id, action: '补招摄影师，或评估临时跨城调度与赛事覆盖目标。', tab: '排班建议' });
    if (schedule && schedule.cost > schedule.budget) risks.push({ id: `budget-${event.event_id}`, level: '严重', title: '成本超标', description: `${event.event_id} 排班成本 ¥${schedule.cost}，预算上限 ¥${schedule.budget}。`, objects: event.event_id, action: '优先调整高报价人选，或审批单场预算。', tab: '排班建议' });
    if (schedule?.shortage) risks.push({ id: `gap-${event.event_id}`, level: '严重', title: '排班存在缺口', description: `${event.event_id} 尚缺 ${schedule.shortage} 名摄影师。`, objects: event.event_id, action: '补招或调度可用摄影师。', tab: '排班建议' });
  }
  const dates = new Map<string, string[]>();
  for (const schedule of schedules) for (const row of schedule.assignments) dates.set(`${row.photographer_id}|${schedule.event.event_date}`, [...(dates.get(`${row.photographer_id}|${schedule.event.event_date}`) ?? []), schedule.event.event_id]);
  for (const [key, eventIds] of dates) if (eventIds.length > 1) risks.push({ id: `conflict-${key}`, level: '严重', title: '档期冲突', description: `${key.split('|')[0]} 同日被分配至多场赛事。`, objects: eventIds.join('、'), action: '重新安排其中一场赛事的人选。', tab: '排班建议' });
  for (const p of photographers.filter((item) => item.rating < 3.5)) risks.push({ id: `rating-${p.photographer_id}`, level: '警告', title: '低评分限制', description: `${p.photographer_id} 评分 ${p.rating.toFixed(1)}，不可安排到难度 ≥4 的赛事。`, objects: p.photographer_id, action: '安排前复核近期作品与评分，避免高难度赛事使用。', tab: '数据' });
  const crossCity = schedules.flatMap((s) => s.assignments).filter((a) => a.crossCity);
  if (crossCity.length) risks.push({ id: 'cross-city', level: '警告', title: '跨城调度', description: `当前有 ${crossCity.length} 人次跨城支援。`, objects: [...new Set(crossCity.map((a) => a.photographer_id))].join('、'), action: '确认交通与住宿安排，并核算差旅成本。', tab: '排班建议' });
  if (!risks.length) risks.push({ id: 'all-clear', level: '提示', title: '一切正常', description: '当前数据未发现供给、成本或档期风险。', objects: '全部赛事', action: '继续关注赛事需求与摄影师档期变化。', tab: '数据' });
  return risks;
}
