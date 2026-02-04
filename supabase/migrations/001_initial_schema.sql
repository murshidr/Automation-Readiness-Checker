-- Automation Readiness Checker: PostgreSQL schema for Supabase
-- Run this in Supabase Dashboard > SQL Editor (New query) and click Run.

-- Assessment sessions (one per "assessment" / named session)
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks belonging to a session
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time_per_task INT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '[]',
  outputs JSONB NOT NULL DEFAULT '[]'
);

-- Scores for each task (1:1 with tasks)
CREATE TABLE IF NOT EXISTS task_scores (
  task_id UUID PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  criteria_scores JSONB NOT NULL,
  final_score INT NOT NULL,
  category TEXT NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  suggested_tools JSONB NOT NULL DEFAULT '[]'
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);

-- Row Level Security (RLS): enable and allow anon for app use without auth
-- For production with auth, replace anon policies with auth.uid() checks
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read assessment_sessions"
  ON assessment_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert assessment_sessions"
  ON assessment_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update assessment_sessions"
  ON assessment_sessions FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete assessment_sessions"
  ON assessment_sessions FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anon read tasks"
  ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert tasks"
  ON tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update tasks"
  ON tasks FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete tasks"
  ON tasks FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anon read task_scores"
  ON task_scores FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert task_scores"
  ON task_scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update task_scores"
  ON task_scores FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete task_scores"
  ON task_scores FOR DELETE TO anon USING (true);
