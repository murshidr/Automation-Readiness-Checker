export enum Frequency {
  ManyTimesDaily = 'many_times_daily', // Score 5
  DailyHigh = 'daily_high',           // Score 4
  WeeklyMultiple = 'weekly_multiple', // Score 3
  Weekly = 'weekly',                  // Score 2
  MonthlyOrLess = 'monthly_or_less'   // Score 1
}

export enum AutomationCategory {
  FullyAutomatable = 'fully',
  PartiallyAutomatable = 'partially',
  NotSuitable = 'not_suitable'
}

export interface TaskInput {
  id: string;
  name: string;
  department: string;
  description: string;
  frequency: Frequency;
  timePerTask: number; // minutes
  inputs: string[];
  outputs: string[];
}

export interface CriteriaScores {
  frequency: number;
  repetitiveness: number;
  dataDependency: number;
  decisionVariability: number;
  complexity: number;
}

export interface ToolSuggestion {
  category: string;
  name: string;
  explanation: string;
}

export interface TaskScore {
  taskId: string;
  criteriaScores: CriteriaScores;
  finalScore: number; // 0-100
  category: AutomationCategory;
  reasoning: string;
  automationAdvice: string;
  suggestedTools: ToolSuggestion[];
}

export interface AssessmentSession {
  token: string;
  createdAt: string;
  tasks: TaskInput[];
  scores: Record<string, TaskScore>;
}