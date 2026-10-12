import type { Assignment, EventAssignment, EventRecord, Photographer, StaffingPlan } from '../types';

function score(p: Photographer, event: EventRecord, budgetPerPerson: number): number {
  const local = p.home_city === event.city ? 100 : 0;
  const rating = p.rating * 10;
  const dormant = Math.min(p.last_active_days, 70) * 0.12;
  const night = event.night_race === 'yes' && p.skill_tags.includes('夜拍') ? 24 : 0;
  const price = Math.max(0, p.price_per_event - budgetPerPerson) * 0.04;
  return local + rating + dormant + night - price;
}

function explain(p: Photographer, event: EventRecord): string {
  const why = [p.home_city === event.city ? '同城' : '跨城调度', `评分 ${p.rating.toFixed(1)}`];
  if (event.night_race === 'yes' && p.skill_tags.includes('夜拍')) why.push('具备夜拍技能');
  if (p.last_active_days >= 30) why.push(`沉睡 ${p.last_active_days} 天优先激活`);
  return why.slice(0, 3).join(' · ');
}

export function assignPhotographers(events: EventRecord[], photographers: Photographer[], plans: StaffingPlan[]): EventAssignment[] {
  const assignedByDate = new Map<string, Set<string>>();
  const planMap = new Map(plans.map((plan) => [plan.event.event_id, plan]));
  return [...events].sort((a, b) => a.event_date.localeCompare(b.event_date) || a.event_id.localeCompare(b.event_id)).map((event) => {
    const plan = planMap.get(event.event_id);
    const target = plan?.recommended ?? 0;
    const budgetPerPerson = target > 0 && plan ? plan.budget / target : 700;
    const usedToday = assignedByDate.get(event.event_date) ?? new Set<string>();
    const candidates = photographers.filter((p) => p.available === 'yes' && !usedToday.has(p.photographer_id)
      && !(p.rating < 3.5 && event.difficulty >= 4)).sort((a, b) => score(b, event, budgetPerPerson) - score(a, event, budgetPerPerson));
    const picked = candidates.slice(0, target);
    for (const p of picked) usedToday.add(p.photographer_id);
    assignedByDate.set(event.event_date, usedToday);
    const assignments: Assignment[] = picked.map((p) => ({
      event_id: event.event_id, photographer_id: p.photographer_id, home_city: p.home_city, rating: p.rating,
      last_active_days: p.last_active_days, skill_tags: p.skill_tags, price_per_event: p.price_per_event,
      crossCity: p.home_city !== event.city, reason: explain(p, event),
    }));
    const cost = assignments.reduce((sum, row) => sum + row.price_per_event, 0);
    return { event, recommended: target, assignments, shortage: Math.max(0, target - picked.length), cost, budget: plan?.budget ?? target * 700 };
  });
}
