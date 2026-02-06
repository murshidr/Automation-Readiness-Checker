import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AssessmentSession, TaskInput, TaskScore } from '../types';
import type { ToolSuggestion } from '../types';
import { scoreTask, type ScoringWeights } from './scoringEngine';
import { v4 as uuidv4 } from 'uuid';

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: string;
}

const CURRENT_SESSION_ID_KEY = 'arc_current_session_id';

function getCurrentSessionId(): string | null {
  return localStorage.getItem(CURRENT_SESSION_ID_KEY);
}
function setCurrentSessionId(id: string): void {
  localStorage.setItem(CURRENT_SESSION_ID_KEY, id);
}
function clearCurrentSessionId(): void {
  localStorage.removeItem(CURRENT_SESSION_ID_KEY);
}

function taskFromRow(row: {
  id: string;
  session_id: string;
  name: string;
  department: string;
  description: string;
  frequency: string;
  time_per_task: number;
  inputs: unknown;
  outputs: unknown;
}): TaskInput {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    description: row.description,
    frequency: row.frequency as TaskInput['frequency'],
    timePerTask: row.time_per_task,
    inputs: Array.isArray(row.inputs) ? row.inputs as string[] : [],
    outputs: Array.isArray(row.outputs) ? row.outputs as string[] : []
  };
}

function scoreFromRow(row: {
  task_id: string;
  criteria_scores: unknown;
  final_score: number;
  category: string;
  reasoning: string;
  automation_advice: string;
  suggested_tools: unknown;
}): TaskScore {
  const criteria = (row.criteria_scores as TaskScore['criteriaScores']) ?? {
    frequency: 0,
    repetitiveness: 0,
    dataDependency: 0,
    decisionVariability: 0,
    complexity: 0
  };
  const suggestedTools = Array.isArray(row.suggested_tools)
    ? (row.suggested_tools as ToolSuggestion[])
    : [];
  return {
    taskId: row.task_id,
    criteriaScores: criteria,
    finalScore: row.final_score,
    category: row.category as TaskScore['category'],
    reasoning: row.reasoning ?? '',
    automationAdvice: row.automation_advice ?? '',
    suggestedTools
  };
}

export async function getSessionsListSupabase(): Promise<SessionMeta[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at
  }));
}

export async function getSessionSupabase(
  getScoringWeights: () => ScoringWeights
): Promise<AssessmentSession> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      token: uuidv4(),
      createdAt: new Date().toISOString(),
      tasks: [],
      scores: {}
    };
  }
  const currentId = getCurrentSessionId();
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id || null;

  if (currentId) {
    try {

      const { data: sessionRow, error: sessionError } = await supabase
        .from('assessment_sessions')
        .select('*')
        .eq('id', currentId)
        .single();

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          console.warn('Session ID not found in Supabase:', currentId);
          localStorage.removeItem('arc_current_session_id');
        } else {
          console.error('Supabase Session Fetch Error:', sessionError);
        }
      }

      if (sessionRow) {

        if (userId && !sessionRow.user_id) {
          console.log('Claiming anonymous session for user:', userId);
          await supabase
            .from('assessment_sessions')
            .update({ user_id: userId })
            .eq('id', currentId);

          // Also claim tasks and scores if they exist
          await supabase.from('tasks').update({ user_id: userId }).eq('session_id', currentId).is('user_id', null);
          await supabase.from('task_scores').update({ user_id: userId }).is('user_id', null).in('task_id',
            (await supabase.from('tasks').select('id').eq('session_id', currentId)).data?.map(t => t.id) || []
          );
        }


        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('session_id', currentId);

        if (tasksError) {
          console.error('Supabase Tasks Fetch Error:', tasksError);
          throw tasksError;
        }

        console.log(`Fetched ${tasksData?.length || 0} tasks for session ${currentId}`);

        const tasks = (tasksData ?? []).map(taskFromRow);
        const taskIds = tasks.map(t => t.id);
        const scores: Record<string, TaskScore> = {};

        if (taskIds.length > 0) {
          const { data: scoresData, error: scoresError } = await supabase
            .from('task_scores')
            .select('*')
            .in('task_id', taskIds);

          if (scoresError) {
            console.error('Supabase Scores Fetch Error:', scoresError);
            throw scoresError;
          }

          for (const row of scoresData ?? []) {
            scores[row.task_id] = scoreFromRow(row);
          }
        }

        return {
          token: sessionRow.token,
          createdAt: sessionRow.created_at,
          tasks,
          scores
        };
      }
    } catch (e) {
      console.warn('Recovering from session fetch error:', e);
      localStorage.removeItem('arc_current_session_id');
    }
  }

  // Fallback to list or new session
  const list = await getSessionsListSupabase();
  console.log('Available sessions list:', list);

  if (list.length > 0) {
    setCurrentSessionId(list[0].id);
    return getSessionSupabase(getScoringWeights);
  }

  console.log('No sessions found, creating new one...');
  return createNewSessionSupabase();
}

export async function createNewSessionSupabase(name?: string): Promise<AssessmentSession> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      token: uuidv4(),
      createdAt: new Date().toISOString(),
      tasks: [],
      scores: {}
    };
  }
  const id = uuidv4();
  const token = uuidv4();
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id || null;

  const sessionName = name ?? `Assessment ${(await getSessionsListSupabase()).length + 1}`;
  const { error } = await supabase.from('assessment_sessions').insert({
    id,
    name: sessionName,
    token,
    user_id: userId,
    created_at: new Date().toISOString()
  });
  if (error) throw error;
  setCurrentSessionId(id);
  return {
    token: String(token),
    createdAt: new Date().toISOString(),
    tasks: [],
    scores: {}
  };
}

export async function setCurrentSessionSupabase(
  id: string,
  getScoringWeights: () => ScoringWeights
): Promise<AssessmentSession | null> {
  const list = await getSessionsListSupabase();
  if (!list.some(s => s.id === id)) return null;
  setCurrentSessionId(id);
  return getSessionSupabase(getScoringWeights);
}

export async function saveSessionSupabase(
  sessionId: string,
  session: AssessmentSession
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  await supabase
    .from('assessment_sessions')
    .update({
      token: session.token,
      created_at: session.createdAt
    })
    .eq('id', sessionId);
}

export async function addTaskToSessionSupabase(
  task: TaskInput,
  getScoringWeights: () => ScoringWeights
): Promise<AssessmentSession> {
  if (!supabase || !isSupabaseConfigured) {
    return { token: '', createdAt: '', tasks: [task], scores: {} };
  }
  const currentId = getCurrentSessionId();
  if (!currentId) throw new Error('No current session');
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id || null;
  const score = scoreTask(task, getScoringWeights());

  await supabase.from('tasks').insert({
    id: task.id,
    session_id: currentId,
    user_id: userId,
    name: task.name,
    department: task.department,
    description: task.description,
    frequency: task.frequency,
    time_per_task: task.timePerTask,
    inputs: task.inputs,
    outputs: task.outputs
  });
  await supabase.from('task_scores').insert({
    task_id: task.id,
    user_id: userId,
    criteria_scores: score.criteriaScores,
    final_score: score.finalScore,
    category: score.category,
    reasoning: score.reasoning,
    automation_advice: score.automationAdvice,
    suggested_tools: score.suggestedTools
  });
  return getSessionSupabase(getScoringWeights);
}

export async function updateTaskInSessionSupabase(
  taskId: string,
  updatedTask: TaskInput,
  getScoringWeights: () => ScoringWeights
): Promise<AssessmentSession> {
  if (!supabase || !isSupabaseConfigured) {
    return { token: '', createdAt: '', tasks: [], scores: {} };
  }
  const currentId = getCurrentSessionId();
  if (!currentId) throw new Error('No current session');
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id || null;
  const score = scoreTask(updatedTask, getScoringWeights());

  await supabase
    .from('tasks')
    .update({
      name: updatedTask.name,
      department: updatedTask.department,
      description: updatedTask.description,
      frequency: updatedTask.frequency,
      time_per_task: updatedTask.timePerTask,
      inputs: updatedTask.inputs,
      outputs: updatedTask.outputs,
      user_id: userId
    })
    .eq('id', taskId)
    .eq('session_id', currentId);
  await supabase
    .from('task_scores')
    .update({
      criteria_scores: score.criteriaScores,
      final_score: score.finalScore,
      category: score.category,
      reasoning: score.reasoning,
      automation_advice: score.automationAdvice,
      suggested_tools: score.suggestedTools,
      user_id: userId
    })
    .eq('task_id', taskId);
  return getSessionSupabase(getScoringWeights);
}

export async function removeTaskFromSessionSupabase(
  taskId: string,
  getScoringWeights: () => ScoringWeights
): Promise<AssessmentSession> {
  if (!supabase || !isSupabaseConfigured) {
    return { token: '', createdAt: '', tasks: [], scores: {} };
  }
  await supabase.from('tasks').delete().eq('id', taskId);
  return getSessionSupabase(getScoringWeights);
}

export async function updateScoreInsightSupabase(
  taskId: string,
  update: { reasoning: string; automationAdvice?: string; suggestedTools: ToolSuggestion[] },
  getScoringWeights: () => ScoringWeights
): Promise<AssessmentSession | null> {
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id || null;
  console.log('Updating score insight for task:', taskId, 'user:', userId);

  const { error } = await supabase
    .from('task_scores')
    .update({
      reasoning: update.reasoning,
      automation_advice: update.automationAdvice ?? '',
      suggested_tools: update.suggestedTools,
      user_id: userId
    })
    .eq('task_id', taskId);
  if (error) {
    console.error('Update Score Insight Error Details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return null;
  }
  return getSessionSupabase(getScoringWeights);
}

export async function clearSessionSupabase(
  getScoringWeights: () => ScoringWeights
): Promise<AssessmentSession> {
  if (!supabase || !isSupabaseConfigured) {
    return { token: uuidv4(), createdAt: new Date().toISOString(), tasks: [], scores: {} };
  }
  const currentId = getCurrentSessionId();
  if (!currentId) return getSessionSupabase(getScoringWeights);
  await supabase.from('tasks').delete().eq('session_id', currentId);
  return getSessionSupabase(getScoringWeights);
}

export async function renameSessionSupabase(id: string, name: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  await supabase.from('assessment_sessions').update({ name }).eq('id', id);
}

export async function deleteSessionSupabase(
  id: string,
  getScoringWeights: () => ScoringWeights
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  await supabase.from('assessment_sessions').delete().eq('id', id);
  const currentId = getCurrentSessionId();
  if (currentId === id) {
    const list = await getSessionsListSupabase();
    const remaining = list.filter(s => s.id !== id);
    if (remaining.length > 0) setCurrentSessionId(remaining[0].id);
    else clearCurrentSessionId();
  }
}

export function getCurrentSessionIdSupabase(): string | null {
  return getCurrentSessionId();
}
