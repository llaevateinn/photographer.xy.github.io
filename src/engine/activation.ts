import type { Activation, EventRecord, EventAssignment, Photographer } from '../types';

export function generateActivations(photographers: Photographer[], events: EventRecord[], schedules: EventAssignment[], edits: Record<string, string> = {}): Activation[] {
  const assignmentCounts = new Map<string, number>();
  for (const schedule of schedules) for (const assignment of schedule.assignments) {
    assignmentCounts.set(assignment.photographer_id, (assignmentCounts.get(assignment.photographer_id) ?? 0) + 1);
  }
  return photographers.filter((p) => p.available === 'yes' && p.rating >= 3.5)
    .sort((a, b) => b.last_active_days - a.last_active_days || (assignmentCounts.get(a.photographer_id) ?? 0) - (assignmentCounts.get(b.photographer_id) ?? 0) || a.photographer_id.localeCompare(b.photographer_id))
    .slice(0, 10).map((photographer, index) => {
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = events.filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
      const event = upcoming.find((e) => e.city === photographer.home_city) ?? upcoming[0]
        ?? [...events].sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
      const payLow = Math.round(photographer.price_per_event * 0.9);
      const payHigh = Math.round(photographer.price_per_event * 1.1);
      const template = `你好，${photographer.photographer_id}！我们近期${event ? `有一场${event.city}赛事可报名，日期是 ${event.event_date}` : '有赛事可报名，日期可进一步确认'}，想邀请你看看是否方便参与。预估报酬为 ¥${payLow}–¥${payHigh}（依据单场报价 ¥${photographer.price_per_event} 上下浮动 10%）。如有兴趣，请回复“报名”并告知可接单时间；不方便也请随时告诉我们。感谢你！`;
      return { photographer, rank: index + 1, script: edits[photographer.photographer_id] ?? template, payLow, payHigh };
    });
}
