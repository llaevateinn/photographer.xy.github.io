import { describe, expect, it } from 'vitest';
import { BUILTIN_EVENTS, BUILTIN_PHOTOGRAPHERS, DEFAULT_PARAMS } from '../data/builtin';
import { calculateStaffing } from './staffing';
import { assignPhotographers } from './assign';
import { generateActivations } from './activation';
import { scanRisks } from './risk';

describe('M2 calculation and scheduling engines', () => {
  const plans = calculateStaffing(BUILTIN_EVENTS, DEFAULT_PARAMS);
  const schedules = assignPhotographers(BUILTIN_EVENTS, BUILTIN_PHOTOGRAPHERS, plans);

  it('follows the PRD photo-yield formula and exposes a reproducible calculation chain', () => {
    expect(plans).toHaveLength(6);
    expect(plans[0].recommended).toBe(13);
    expect(plans[5].recommended).toBe(18);
    expect(plans[5].calculation.join('\n')).toContain('目标可用照片 = 6000 × 0.85 × 3 = 15300.00 张');
    expect(plans[5].calculation.join('\n')).toContain('0.85（夜跑） × 0.9（难度5（≥4）） × 0.95（全马（42km））');
    expect(plans[5].calculation.join('\n')).toContain('推荐人数 = ceil(');
    expect(plans[0].baseline).toBe(plans[0].recommended);
    const changed = calculateStaffing(BUILTIN_EVENTS, { ...DEFAULT_PARAMS, usable_rate: 0.5 });
    expect(changed.every((row, index) => row.recommended >= plans[index].recommended)).toBe(true);
  });

  it('never assigns unavailable, low-rated high-difficulty, or same-day duplicate photographers', () => {
    const all = schedules.flatMap((schedule) => schedule.assignments.map((a) => ({ ...a, date: schedule.event.event_date, difficulty: schedule.event.difficulty })));
    expect(all.every((a) => BUILTIN_PHOTOGRAPHERS.find((p) => p.photographer_id === a.photographer_id)?.available === 'yes')).toBe(true);
    expect(all.every((a) => !(a.rating < 3.5 && a.difficulty >= 4))).toBe(true);
    expect(new Set(all.map((a) => `${a.photographer_id}|${a.date}`)).size).toBe(all.length);
    expect(all.every((a) => a.reason.length > 0)).toBe(true);
    expect(schedules.find((s) => s.event.event_id === 'E006')?.shortage).toBeGreaterThan(0);
  });

  it('generates a ranked top ten and actionable supply-gap risks', () => {
    const activations = generateActivations(BUILTIN_PHOTOGRAPHERS, BUILTIN_EVENTS, schedules);
    expect(activations).toHaveLength(10);
    expect(activations.map((row) => row.photographer.last_active_days)).toEqual([...activations.map((row) => row.photographer.last_active_days)].sort((a, b) => b - a));
    expect(activations.every((row) => row.photographer.rating >= 3.5 && row.script.includes('报名'))).toBe(true);
    expect(activations.every((row) => row.script.includes('¥') && /\d{4}-\d{2}-\d{2}/.test(row.script))).toBe(true);
    const risks = scanRisks(BUILTIN_EVENTS, BUILTIN_PHOTOGRAPHERS, plans, schedules);
    expect(risks.some((risk) => risk.level === '严重' && risk.title === '供给不足' && risk.objects === 'E006')).toBe(true);
    expect(risks.every((risk) => risk.action.length > 0)).toBe(true);
  });
});
