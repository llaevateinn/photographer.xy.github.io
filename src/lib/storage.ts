import type { AppState } from '../types';
import { makeDefaultState } from '../data/builtin';

export const STATE_KEY = 'ayd_state_v1';
export const SNAPSHOTS_KEY = 'ayd_snapshots_v1';

export function validateAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppState>;
  const eventFields = ['event_id', 'city', 'event_date', 'participants', 'course_km', 'time_window_hours', 'night_race', 'difficulty'] as const;
  const params = state.params;
  return state.version === 1 && Array.isArray(state.events) && state.events.every((event) => {
    if (!event || typeof event !== 'object') return false;
    const row = event as unknown as Record<string, unknown>;
    return eventFields.every((field) => field in row)
      && typeof row.event_id === 'string' && !!row.event_id.trim() && typeof row.city === 'string' && !!row.city.trim()
      && typeof row.event_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.event_date)
      && ['participants', 'course_km', 'time_window_hours', 'difficulty'].every((field) => typeof row[field] === 'number' && Number.isFinite(row[field]))
      && Number(row.participants) > 0 && Number(row.course_km) > 0 && Number(row.time_window_hours) > 0
      && Number(row.difficulty) >= 1 && Number(row.difficulty) <= 5 && ['yes', 'no'].includes(String(row.night_race));
  }) && new Set(state.events.map((event) => event.event_id)).size === state.events.length
    && Array.isArray(state.photographers) && state.photographers.every((person) => {
      if (!person || typeof person !== 'object') return false;
      const row = person as unknown as Record<string, unknown>;
      return typeof row.photographer_id === 'string' && !!row.photographer_id.trim()
        && typeof row.home_city === 'string' && !!row.home_city.trim()
        && ['price_per_event', 'rating', 'last_active_days'].every((field) => typeof row[field] === 'number' && Number.isFinite(row[field]))
        && Number(row.price_per_event) >= 0 && Number(row.rating) >= 0 && Number(row.rating) <= 5 && Number(row.last_active_days) >= 0
        && Array.isArray(row.skill_tags) && row.skill_tags.every((tag) => typeof tag === 'string')
        && ['yes', 'no'].includes(String(row.available));
    }) && new Set(state.photographers.map((person) => person.photographer_id)).size === state.photographers.length
    && !!params && ['coverage_rate', 'photos_per_covered_user', 'usable_rate', 'raw_photos_per_hour', 'night_factor', 'high_difficulty_factor', 'marathon_factor']
      .every((key) => typeof params[key as keyof typeof params] === 'number' && Number.isFinite(params[key as keyof typeof params]))
    && Object.values(params).every((n) => typeof n === 'number' && n > 0)
    && !!state.scriptEdits && typeof state.scriptEdits === 'object' && !Array.isArray(state.scriptEdits)
    && Object.values(state.scriptEdits).every((script) => typeof script === 'string')
    && (state.savedAt === null || typeof state.savedAt === 'string');
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return makeDefaultState();
    const value: unknown = JSON.parse(raw);
    return validateAppState(value) ? value : makeDefaultState();
  } catch { return makeDefaultState(); }
}

export function saveState(state: AppState): void { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }

export function createDebouncedSave(delay = 1000, onSaved?: (at: string) => void): (state: AppState) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (state) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const at = new Date().toISOString();
      saveState({ ...state, savedAt: at });
      onSaved?.(at);
    }, delay);
  };
}
