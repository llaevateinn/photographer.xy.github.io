import type { AppState, EventRecord, Params, Photographer } from '../types';

export const BUILTIN_EVENTS: EventRecord[] = [
  { event_id: 'E001', city: '广州', event_date: '2026-09-06', participants: 5000, course_km: 42, time_window_hours: 4, night_race: 'no', difficulty: 4 },
  { event_id: 'E002', city: '深圳', event_date: '2026-09-13', participants: 4200, course_km: 21, time_window_hours: 3, night_race: 'no', difficulty: 3 },
  { event_id: 'E003', city: '珠海', event_date: '2026-09-20', participants: 2800, course_km: 21, time_window_hours: 3, night_race: 'no', difficulty: 2 },
  { event_id: 'E004', city: '广州', event_date: '2026-10-11', participants: 5200, course_km: 42, time_window_hours: 4, night_race: 'no', difficulty: 4 },
  { event_id: 'E005', city: '深圳', event_date: '2026-10-18', participants: 4500, course_km: 42, time_window_hours: 4, night_race: 'no', difficulty: 3 },
  { event_id: 'E006', city: '广州', event_date: '2026-11-01', participants: 6000, course_km: 42, time_window_hours: 4, night_race: 'yes', difficulty: 5 },
];

export const BUILTIN_PHOTOGRAPHERS: Photographer[] = [
  { photographer_id: 'P001', home_city: '广州', price_per_event: 700, rating: 4.8, last_active_days: 45, skill_tags: ['跑步', '冲线', '人像'], available: 'yes' },
  { photographer_id: 'P002', home_city: '广州', price_per_event: 650, rating: 4.5, last_active_days: 30, skill_tags: ['跑步', '夜拍'], available: 'yes' },
  { photographer_id: 'P003', home_city: '广州', price_per_event: 780, rating: 4.2, last_active_days: 10, skill_tags: ['跑步', '航拍', '夜拍'], available: 'yes' },
  { photographer_id: 'P004', home_city: '广州', price_per_event: 600, rating: 3.2, last_active_days: 60, skill_tags: ['跑步'], available: 'yes' },
  { photographer_id: 'P005', home_city: '广州', price_per_event: 720, rating: 4.6, last_active_days: 55, skill_tags: ['跑步', '冲线'], available: 'yes' },
  { photographer_id: 'P006', home_city: '深圳', price_per_event: 680, rating: 4.7, last_active_days: 40, skill_tags: ['跑步', '人像'], available: 'yes' },
  { photographer_id: 'P007', home_city: '深圳', price_per_event: 620, rating: 4.0, last_active_days: 20, skill_tags: ['跑步'], available: 'no' },
  { photographer_id: 'P008', home_city: '深圳', price_per_event: 750, rating: 4.9, last_active_days: 5, skill_tags: ['跑步', '冲线', '航拍'], available: 'yes' },
  { photographer_id: 'P009', home_city: '深圳', price_per_event: 580, rating: 3.4, last_active_days: 70, skill_tags: ['人像'], available: 'yes' },
  { photographer_id: 'P010', home_city: '深圳', price_per_event: 690, rating: 4.3, last_active_days: 35, skill_tags: ['跑步', '夜拍'], available: 'no' },
  { photographer_id: 'P011', home_city: '珠海', price_per_event: 630, rating: 4.4, last_active_days: 25, skill_tags: ['跑步'], available: 'yes' },
  { photographer_id: 'P012', home_city: '珠海', price_per_event: 660, rating: 4.6, last_active_days: 50, skill_tags: ['跑步', '人像'], available: 'yes' },
  { photographer_id: 'P013', home_city: '珠海', price_per_event: 590, rating: 3.3, last_active_days: 15, skill_tags: ['跑步'], available: 'yes' },
  { photographer_id: 'P014', home_city: '珠海', price_per_event: 710, rating: 4.1, last_active_days: 8, skill_tags: ['航拍'], available: 'no' },
  { photographer_id: 'P015', home_city: '广州', price_per_event: 690, rating: 4.3, last_active_days: 38, skill_tags: ['跑步', '人像'], available: 'yes' },
  { photographer_id: 'P016', home_city: '深圳', price_per_event: 670, rating: 4.5, last_active_days: 42, skill_tags: ['跑步', '夜拍'], available: 'yes' },
];

export const DEFAULT_PARAMS: Params = {
  coverage_rate: 0.85,
  photos_per_covered_user: 3,
  usable_rate: 0.6,
  raw_photos_per_hour: 500,
  night_factor: 0.85,
  high_difficulty_factor: 0.9,
  marathon_factor: 0.95,
};

export function makeDefaultState(): AppState {
  return {
    version: 1,
    events: structuredClone(BUILTIN_EVENTS),
    photographers: structuredClone(BUILTIN_PHOTOGRAPHERS),
    params: { ...DEFAULT_PARAMS },
    scriptEdits: {},
    savedAt: null,
  };
}
