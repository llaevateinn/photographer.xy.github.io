import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppState as ModelState, EventRecord, Params, Photographer } from '../types';
import { loadState, createDebouncedSave } from '../lib/storage';
import { calculateStaffing } from '../engine/staffing';
import { assignPhotographers } from '../engine/assign';
import { generateActivations } from '../engine/activation';
import { scanRisks } from '../engine/risk';

type Action =
  | { type: 'events'; value: EventRecord[] }
  | { type: 'photographers'; value: Photographer[] }
  | { type: 'params'; value: Params }
  | { type: 'script'; id: string; value: string }
  | { type: 'replace'; value: ModelState };

function reducer(state: ModelState, action: Action): ModelState {
  switch (action.type) {
    case 'events': return { ...state, events: action.value };
    case 'photographers': return { ...state, photographers: action.value };
    case 'params': return { ...state, params: action.value };
    case 'script': return { ...state, scriptEdits: { ...state.scriptEdits, [action.id]: action.value } };
    case 'replace': return action.value;
  }
}

interface AppContextValue {
  state: ModelState;
  savedAt: string | null;
  dispatch: (action: Action) => void;
  staffing: ReturnType<typeof calculateStaffing>;
  assignments: ReturnType<typeof assignPhotographers>;
  activations: ReturnType<typeof generateActivations>;
  risks: ReturnType<typeof scanRisks>;
}
const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [savedAt, setSavedAt] = useState<string | null>(state.savedAt);
  const saveRef = useRef<((next: ModelState) => void) | null>(null);
  if (!saveRef.current) saveRef.current = createDebouncedSave(1000, setSavedAt);
  const staffing = useMemo(() => calculateStaffing(state.events, state.params), [state.events, state.params]);
  const assignments = useMemo(() => assignPhotographers(state.events, state.photographers, staffing), [state.events, state.photographers, staffing]);
  const activations = useMemo(() => generateActivations(state.photographers, state.events, assignments, state.scriptEdits), [state.photographers, state.events, assignments, state.scriptEdits]);
  const risks = useMemo(() => scanRisks(state.events, state.photographers, staffing, assignments), [state.events, state.photographers, staffing, assignments]);

  useEffect(() => {
    saveRef.current?.(state);
  }, [state]);

  const value = useMemo(() => ({ state, savedAt, dispatch, staffing, assignments, activations, risks }), [state, savedAt, staffing, assignments, activations, risks]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppState must be used within AppStateProvider');
  return value;
}
