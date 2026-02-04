import { AssessmentSession, TaskInput, TaskScore } from '../types';
import type { ToolSuggestion } from '../types';
import { scoreTask, DEFAULT_WEIGHTS, type ScoringWeights } from './scoringEngine';
import { v4 as uuidv4 } from 'uuid';
import { isSupabaseConfigured } from './supabaseClient';
import * as supabaseStorage from './supabaseStorage';

const SCORING_WEIGHTS_KEY = 'arc_scoring_weights_v1';
const HOURLY_RATE_KEY = 'arc_hourly_rate_v1';

const STORAGE_KEY = 'arc_session_v1';
const SESSIONS_LIST_KEY = 'arc_sessions_v1';
const CURRENT_SESSION_ID_KEY = 'arc_current_session_id';

const TTL_DAYS = 7;

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: string;
}

interface StoredSessionItem {
  id: string;
  name: string;
  session: AssessmentSession;
}

function getSessionsListRaw(): StoredSessionItem[] {
  const stored = localStorage.getItem(SESSIONS_LIST_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function setSessionsListRaw(list: StoredSessionItem[]) {
  localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(list));
}

export function getCurrentSessionId(): string | null {
  migrateFromLegacySession();
  return localStorage.getItem(CURRENT_SESSION_ID_KEY);
}

function setCurrentSessionId(id: string) {
  localStorage.setItem(CURRENT_SESSION_ID_KEY, id);
}

function migrateFromLegacySession(): void {
  const legacy = localStorage.getItem(STORAGE_KEY);
  if (!legacy) return;
  try {
    const session: AssessmentSession = JSON.parse(legacy);
    const list = getSessionsListRaw();
    const id = uuidv4();
    const item: StoredSessionItem = {
      id,
      name: 'Assessment 1',
      session
    };
    setSessionsListRaw([...list, item]);
    setCurrentSessionId(id);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getScoringWeights(): ScoringWeights {
  const stored = localStorage.getItem(SCORING_WEIGHTS_KEY);
  if (!stored) return DEFAULT_WEIGHTS;
  try {
    const w = JSON.parse(stored) as ScoringWeights;
    return { ...DEFAULT_WEIGHTS, ...w };
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

export function setScoringWeights(weights: ScoringWeights): void {
  localStorage.setItem(SCORING_WEIGHTS_KEY, JSON.stringify(weights));
}

export function getHourlyRate(): number | null {
  const v = localStorage.getItem(HOURLY_RATE_KEY);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function setHourlyRate(rate: number | null): void {
  if (rate === null) localStorage.removeItem(HOURLY_RATE_KEY);
  else localStorage.setItem(HOURLY_RATE_KEY, String(rate));
}

export function getSessionsList(): SessionMeta[] {
  migrateFromLegacySession();
  const list = getSessionsListRaw();
  return list.map(({ id, name, session }) => ({
    id,
    name,
    createdAt: session.createdAt
  }));
}

export function getSession(): AssessmentSession {
  migrateFromLegacySession();
  const list = getSessionsListRaw();
  const currentId = getCurrentSessionId();
  let item = list.find(s => s.id === currentId);
  if (currentId && !item) {
    item = list[0];
    if (item) setCurrentSessionId(item.id);
  }

  if (!item) {
    const newSession: AssessmentSession = {
      token: uuidv4(),
      createdAt: new Date().toISOString(),
      tasks: [],
      scores: {}
    };
    const id = uuidv4();
    const name = `Assessment ${list.length + 1}`;
    item = { id, name, session: newSession };
    setSessionsListRaw([...list, item]);
    setCurrentSessionId(id);
    return newSession;
  }

  const diff = new Date().getTime() - new Date(item.session.createdAt).getTime();
  const days = diff / (1000 * 3600 * 24);
  if (days >= TTL_DAYS && item.session.tasks.length === 0) {
    item.session = {
      token: uuidv4(),
      createdAt: new Date().toISOString(),
      tasks: [],
      scores: {}
    };
    setSessionsListRaw(list.map(s => (s.id === item!.id ? item! : s)));
  }

  return item.session;
}

export function saveSession(session: AssessmentSession): void {
  const list = getSessionsListRaw();
  const currentId = getCurrentSessionId();
  const index = list.findIndex(s => s.id === currentId);
  if (index === -1) return;
  list[index] = { ...list[index], session };
  setSessionsListRaw(list);
}

export function setCurrentSession(id: string): AssessmentSession | null {
  const list = getSessionsListRaw();
  const item = list.find(s => s.id === id);
  if (!item) return null;
  setCurrentSessionId(id);
  return item.session;
}

export function createNewSession(name?: string): AssessmentSession {
  const list = getSessionsListRaw();
  const newSession: AssessmentSession = {
    token: uuidv4(),
    createdAt: new Date().toISOString(),
    tasks: [],
    scores: {}
  };
  const id = uuidv4();
  const sessionName = name || `Assessment ${list.length + 1}`;
  const item: StoredSessionItem = { id, name: sessionName, session: newSession };
  setSessionsListRaw([...list, item]);
  setCurrentSessionId(id);
  return newSession;
}

export function renameSession(id: string, name: string): void {
  const list = getSessionsListRaw();
  const index = list.findIndex(s => s.id === id);
  if (index === -1) return;
  list[index] = { ...list[index], name };
  setSessionsListRaw(list);
}

export function deleteSession(id: string): void {
  const list = getSessionsListRaw().filter(s => s.id !== id);
  const currentId = getCurrentSessionId();
  setSessionsListRaw(list);
  if (currentId === id) {
    if (list.length > 0) setCurrentSessionId(list[0].id);
    else localStorage.removeItem(CURRENT_SESSION_ID_KEY);
  }
}

export const addTaskToSession = (task: TaskInput): AssessmentSession => {
  const session = getSession();
  const updatedTasks = [...session.tasks, task];
  const score = scoreTask(task, getScoringWeights());

  const updatedSession = {
    ...session,
    tasks: updatedTasks,
    scores: {
      ...session.scores,
      [task.id]: score
    }
  };

  saveSession(updatedSession);
  return updatedSession;
};

export const updateTaskInSession = (taskId: string, updatedTask: TaskInput): AssessmentSession => {
  const session = getSession();
  const taskIndex = session.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return session;

  const updatedTasks = [...session.tasks];
  updatedTasks[taskIndex] = updatedTask;
  const score = scoreTask(updatedTask, getScoringWeights());

  const updatedSession = {
    ...session,
    tasks: updatedTasks,
    scores: {
      ...session.scores,
      [taskId]: score
    }
  };

  saveSession(updatedSession);
  return updatedSession;
};

export const removeTaskFromSession = (taskId: string): AssessmentSession => {
  const session = getSession();
  const updatedTasks = session.tasks.filter(t => t.id !== taskId);
  const { [taskId]: _, ...restScores } = session.scores;

  const updatedSession = {
    ...session,
    tasks: updatedTasks,
    scores: restScores
  };

  saveSession(updatedSession);
  return updatedSession;
};

export function updateScoreInsight(
  taskId: string,
  update: { reasoning: string; automationAdvice?: string; suggestedTools: ToolSuggestion[] }
): AssessmentSession | null {
  const session = getSession();
  const score = session.scores[taskId];
  if (!score) return null;
  const updatedScores = {
    ...session.scores,
    [taskId]: {
      ...score,
      reasoning: update.reasoning,
      automationAdvice: update.automationAdvice || '',
      suggestedTools: update.suggestedTools
    }
  };
  const updatedSession = { ...session, scores: updatedScores };
  saveSession(updatedSession);
  return updatedSession;
}

export const clearSession = (): void => {
  const list = getSessionsListRaw();
  const currentId = getCurrentSessionId();
  const index = list.findIndex(s => s.id === currentId);
  if (index === -1) return;
  const emptySession: AssessmentSession = {
    token: uuidv4(),
    createdAt: new Date().toISOString(),
    tasks: [],
    scores: {}
  };
  list[index] = { ...list[index], session: emptySession };
  setSessionsListRaw(list);
};

// --- Supabase: re-export and async API ---
export { isSupabaseConfigured, supabase } from './supabaseClient';

export async function getSessionAsync(): Promise<AssessmentSession> {
  if (isSupabaseConfigured) return supabaseStorage.getSessionSupabase(getScoringWeights);
  return Promise.resolve(getSession());
}

export async function getSessionsListAsync(): Promise<SessionMeta[]> {
  if (isSupabaseConfigured) return supabaseStorage.getSessionsListSupabase();
  return Promise.resolve(getSessionsList());
}

export async function createNewSessionAsync(name?: string): Promise<AssessmentSession> {
  if (isSupabaseConfigured) return supabaseStorage.createNewSessionSupabase(name);
  return Promise.resolve(createNewSession(name));
}

export async function setCurrentSessionAsync(id: string): Promise<AssessmentSession | null> {
  if (isSupabaseConfigured) return supabaseStorage.setCurrentSessionSupabase(id, getScoringWeights);
  return Promise.resolve(setCurrentSession(id));
}

export async function addTaskToSessionAsync(task: TaskInput): Promise<AssessmentSession> {
  if (isSupabaseConfigured) return supabaseStorage.addTaskToSessionSupabase(task, getScoringWeights);
  return Promise.resolve(addTaskToSession(task));
}

export async function updateTaskInSessionAsync(
  taskId: string,
  updatedTask: TaskInput
): Promise<AssessmentSession> {
  if (isSupabaseConfigured) return supabaseStorage.updateTaskInSessionSupabase(taskId, updatedTask, getScoringWeights);
  return Promise.resolve(updateTaskInSession(taskId, updatedTask));
}

export async function removeTaskFromSessionAsync(taskId: string): Promise<AssessmentSession> {
  if (isSupabaseConfigured) return supabaseStorage.removeTaskFromSessionSupabase(taskId, getScoringWeights);
  return Promise.resolve(removeTaskFromSession(taskId));
}

export async function clearSessionAsync(): Promise<AssessmentSession> {
  if (isSupabaseConfigured) return supabaseStorage.clearSessionSupabase(getScoringWeights);
  clearSession();
  return Promise.resolve(getSession());
}

export async function updateScoreInsightAsync(
  taskId: string,
  update: { reasoning: string; automationAdvice?: string; suggestedTools: ToolSuggestion[] }
): Promise<AssessmentSession | null> {
  if (isSupabaseConfigured) return supabaseStorage.updateScoreInsightSupabase(taskId, update, getScoringWeights);
  return Promise.resolve(updateScoreInsight(taskId, update));
}

export async function renameSessionAsync(id: string, name: string): Promise<void> {
  if (isSupabaseConfigured) return supabaseStorage.renameSessionSupabase(id, name);
  renameSession(id, name);
}

export async function deleteSessionAsync(id: string): Promise<void> {
  if (isSupabaseConfigured) return supabaseStorage.deleteSessionSupabase(id, getScoringWeights);
  deleteSession(id);
}
