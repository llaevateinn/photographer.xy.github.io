export type YesNo = 'yes' | 'no';

export interface EventRecord {
  event_id: string;
  city: string;
  event_date: string;
  participants: number;
  course_km: number;
  time_window_hours: number;
  night_race: YesNo;
  difficulty: number;
}

export interface Photographer {
  photographer_id: string;
  home_city: string;
  price_per_event: number;
  rating: number;
  last_active_days: number;
  skill_tags: string[];
  available: YesNo;
}

export interface Params {
  coverage_rate: number;
  photos_per_covered_user: number;
  usable_rate: number;
  raw_photos_per_hour: number;
  night_factor: number;
  high_difficulty_factor: number;
  marathon_factor: number;
  budget_per_photographer: number;
}

export interface AppState {
  version: 1;
  events: EventRecord[];
  photographers: Photographer[];
  params: Params;
  scriptEdits: Record<string, string>;
  savedAt: string | null;
}

export type TabId = '数据' | '需求测算' | '排班建议' | '激活召回' | '风险提示';

export interface StaffingPlan {
  event: EventRecord;
  recommended: number;
  baseline: number;
  estimatedCost: number;
  budget: number;
  overBudget: boolean;
  calculation: string[];
}

export interface Assignment {
  event_id: string;
  photographer_id: string;
  home_city: string;
  rating: number;
  last_active_days: number;
  skill_tags: string[];
  price_per_event: number;
  crossCity: boolean;
  reason: string;
}

export interface EventAssignment {
  event: EventRecord;
  recommended: number;
  assignments: Assignment[];
  shortage: number;
  cost: number;
  budget: number;
}

export interface Activation {
  photographer: Photographer;
  rank: number;
  script: string;
  payLow: number;
  payHigh: number;
}

export type RiskLevel = '严重' | '警告' | '提示';
export interface RiskItem {
  id: string;
  level: RiskLevel;
  title: string;
  description: string;
  objects: string;
  action: string;
  tab: TabId;
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  summary: { eventCount: number; photographerCount: number };
  payload: AppState;
}

export interface CsvIssue { row: number; field: string; reason: string }
export interface CsvResult<T> { ok: boolean; rows: T[]; issues: CsvIssue[] }
