-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tables
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), 
  name TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), 
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time_per_task INT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '[]',
  outputs JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS task_scores (
  task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), 
  criteria_scores JSONB NOT NULL,
  final_score INT NOT NULL,
  category TEXT NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  automation_advice TEXT NOT NULL DEFAULT '',
  suggested_tools JSONB NOT NULL DEFAULT '[]'
);


ALTER TABLE assessment_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE task_scores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE task_scores ADD COLUMN IF NOT EXISTS automation_advice TEXT NOT NULL DEFAULT '';

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_scores_user_id ON task_scores(user_id);

-- 4. RLS Enable
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_scores ENABLE ROW LEVEL SECURITY;

-- 5. RE-INITIALIZE POLICIES (Drop existing ones first to avoid "already exists" errors)
DROP POLICY IF EXISTS "manage_own_sessions" ON assessment_sessions;
DROP POLICY IF EXISTS "assessment_sessions_all" ON assessment_sessions;
DROP POLICY IF EXISTS "manage_tasks_via_session" ON tasks;
DROP POLICY IF EXISTS "tasks_all" ON tasks;
DROP POLICY IF EXISTS "manage_scores_via_task" ON task_scores;
DROP POLICY IF EXISTS "task_scores_all" ON task_scores;

-- 6. Create Direct, Robust Policies
CREATE POLICY "assessment_sessions_all" ON assessment_sessions
  FOR ALL TO authenticated, anon
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "tasks_all" ON tasks
  FOR ALL TO authenticated, anon
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "task_scores_all" ON task_scores
  FOR ALL TO authenticated, anon
  USING (user_id = auth.uid() OR user_id IS NULL);