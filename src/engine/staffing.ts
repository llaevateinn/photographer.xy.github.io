import type { EventRecord, Params, StaffingPlan } from '../types';
import { DEFAULT_PARAMS } from '../data/builtin';

export function calculateStaffing(events: EventRecord[], params: Params): StaffingPlan[] {
  return events.map((event) => {
    const target = event.participants * params.coverage_rate * params.photos_per_covered_user;
    let usable = event.time_window_hours * params.raw_photos_per_hour * params.usable_rate;
    const steps = [`目标可用照片 = ${event.participants} × ${params.coverage_rate} × ${params.photos_per_covered_user} = ${target.toFixed(2)} 张`];
    const factors: { label: string; value: number }[] = [];
    if (event.night_race === 'yes') factors.push({ label: '夜跑', value: params.night_factor });
    if (event.difficulty >= 4) factors.push({ label: `难度${event.difficulty}（≥4）`, value: params.high_difficulty_factor });
    if (event.course_km >= 42) factors.push({ label: '全马（42km）', value: params.marathon_factor });
    for (const factor of factors) usable *= factor.value;
    steps.push(`摄影师单人有效产能 = ${event.time_window_hours} × ${params.raw_photos_per_hour} × ${params.usable_rate}${factors.map((f) => ` × ${f.value}（${f.label}）`).join('')} = ${usable.toFixed(2)} 张`);
    const recommended = Math.ceil(target / usable);
    steps.push(`推荐人数 = ceil(${target.toFixed(2)} ÷ ${usable.toFixed(2)}) = ${recommended} 人`);
    steps.push(`预算上限 = ${recommended} × ¥${params.budget_per_photographer} = ¥${recommended * params.budget_per_photographer}`);
    const baselineUsable = event.time_window_hours * DEFAULT_PARAMS.raw_photos_per_hour * DEFAULT_PARAMS.usable_rate
      * (event.night_race === 'yes' ? DEFAULT_PARAMS.night_factor : 1)
      * (event.difficulty >= 4 ? DEFAULT_PARAMS.high_difficulty_factor : 1)
      * (event.course_km >= 42 ? DEFAULT_PARAMS.marathon_factor : 1);
    const baseline = Math.ceil(event.participants * DEFAULT_PARAMS.coverage_rate * DEFAULT_PARAMS.photos_per_covered_user / baselineUsable);
    const budget = recommended * params.budget_per_photographer;
    return { event, recommended, baseline, estimatedCost: budget, budget, overBudget: false, calculation: steps };
  });
}
