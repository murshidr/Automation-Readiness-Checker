import { TaskInput, TaskScore, CriteriaScores, AutomationCategory, Frequency, ToolSuggestion } from '../types';

export interface ScoringWeights {
  frequency: number;
  repetitiveness: number;
  dataDependency: number;
  decisionVariability: number;
  complexity: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  frequency: 0.25,
  repetitiveness: 0.25,
  dataDependency: 0.20,
  decisionVariability: 0.20,
  complexity: 0.10
};

// --- Helper Functions ---

const scoreFrequency = (freq: Frequency): number => {
  const map: Record<Frequency, number> = {
    [Frequency.ManyTimesDaily]: 5,
    [Frequency.DailyHigh]: 4,
    [Frequency.WeeklyMultiple]: 3,
    [Frequency.Weekly]: 2,
    [Frequency.MonthlyOrLess]: 1
  };
  return map[freq] || 3;
};

const scoreRepetitiveness = (description: string): number => {
  const lowerDesc = description.toLowerCase();

  const highSignals = ['same', 'identical', 'always', 'routine', 'standard', 'template', 'copy', 'repeat'];
  const lowSignals = ['different', 'varies', 'custom', 'creative', 'unique', 'case by case', 'strategic', 'negotiate'];

  let score = 3; // Default

  if (highSignals.some(w => lowerDesc.includes(w))) score += 1;
  if (lowSignals.some(w => lowerDesc.includes(w))) score -= 1;

  // Cap between 1 and 5
  return Math.max(1, Math.min(5, score));
};

const scoreDataDependency = (inputs: string[], outputs: string[]): number => {
  const allData = [...inputs, ...outputs].map(d => d.toLowerCase());

  const digitalStructured = ['excel', 'spreadsheet', 'database', 'api', 'crm', 'web forms'];
  const digitalSemi = ['email', 'pdf'];
  const analog = ['paper', 'physical', 'phone', 'verbal'];

  let points = 0;
  let count = 0;

  allData.forEach(item => {
    count++;
    if (digitalStructured.some(k => item.includes(k))) points += 5;
    else if (digitalSemi.some(k => item.includes(k))) points += 3.5;
    else if (analog.some(k => item.includes(k))) points += 1;
    else points += 3;
  });

  if (count === 0) return 3;
  return Math.max(1, Math.min(5, Math.round(points / count)));
};

const scoreDecisionVariability = (description: string): number => {
  const lowerDesc = description.toLowerCase();

  const ruleSignals = ['if', 'when', 'automatic', 'always', 'rule', 'fixed'];
  const judgmentSignals = ['decide', 'evaluate', 'consider', 'judge', 'analysis', 'thinking', 'review'];

  let score = 3;
  if (ruleSignals.some(w => lowerDesc.includes(w))) score += 1;
  if (judgmentSignals.some(w => lowerDesc.includes(w))) score -= 1;

  return Math.max(1, Math.min(5, score));
};

const scoreComplexity = (description: string): number => {
  // Simple heuristic: Action verb count approximately correlates to steps
  const actionVerbs = ['check', 'send', 'update', 'create', 'review', 'approve', 'process', 'enter', 'calculate', 'generate'];
  const lowerDesc = description.toLowerCase();

  let verbCount = 0;
  actionVerbs.forEach(verb => {
    if (lowerDesc.includes(verb)) verbCount++;
  });

  // Fewer verbs/steps = Higher Score (Easier to automate)
  if (verbCount <= 1) return 5;
  if (verbCount <= 3) return 4;
  if (verbCount <= 5) return 3;
  return 2;
};

const determineCategory = (finalScore: number): AutomationCategory => {
  if (finalScore >= 80) return AutomationCategory.FullyAutomatable;
  if (finalScore >= 40) return AutomationCategory.PartiallyAutomatable;
  return AutomationCategory.NotSuitable;
};

const generateTools = (task: TaskInput, score: number): ToolSuggestion[] => {
  const suggestions: ToolSuggestion[] = [];
  const inputs = task.inputs.join(' ').toLowerCase();
  const outputs = task.outputs.join(' ').toLowerCase();
  const desc = task.description.toLowerCase();

  if (score >= 40) {
    if (inputs.includes('email') || inputs.includes('crm')) {
      suggestions.push({
        category: 'AI Assistant',
        name: 'Chatbot / Email AI',
        explanation: 'Automate responses and data lookup.'
      });
    }
    if (inputs.includes('excel') || inputs.includes('spreadsheet')) {
      suggestions.push({
        category: 'RPA / Integration',
        name: 'Zapier / Make',
        explanation: 'Connect spreadsheets to other apps automatically.'
      });
    }
    if (inputs.includes('pdf') || inputs.includes('paper')) {
      suggestions.push({
        category: 'OCR',
        name: 'Document AI',
        explanation: 'Extract text from documents automatically.'
      });
    }
    if (inputs.includes('database') || inputs.includes('api') || outputs.includes('database')) {
      suggestions.push({
        category: 'Integration',
        name: 'n8n / Pipedream',
        explanation: 'Connect databases and APIs with low-code workflows.'
      });
    }
    if (desc.includes('approve') || desc.includes('review') || outputs.includes('notification')) {
      suggestions.push({
        category: 'Approval & Notifications',
        name: 'Approval workflows / Slack',
        explanation: 'Route items for approval and send notifications automatically.'
      });
    }
    if (outputs.includes('report') || desc.includes('report') || desc.includes('summary')) {
      suggestions.push({
        category: 'Reporting',
        name: 'BI tools / Scheduled reports',
        explanation: 'Generate and distribute reports on a schedule.'
      });
    }
    if (suggestions.length === 0) {
      suggestions.push({
        category: 'General Automation',
        name: 'Workflow Scripting',
        explanation: 'Custom scripts to handle data entry.'
      });
    }
  }

  return suggestions;
};

// --- Main Export ---

export const scoreTask = (task: TaskInput, customWeights?: ScoringWeights): TaskScore => {
  const criteria: CriteriaScores = {
    frequency: scoreFrequency(task.frequency),
    repetitiveness: scoreRepetitiveness(task.description),
    dataDependency: scoreDataDependency(task.inputs, task.outputs),
    decisionVariability: scoreDecisionVariability(task.description),
    complexity: scoreComplexity(task.description)
  };

  const weights = customWeights || DEFAULT_WEIGHTS;
  const rawScore =
    (criteria.frequency * weights.frequency) +
    (criteria.repetitiveness * weights.repetitiveness) +
    (criteria.dataDependency * weights.dataDependency) +
    (criteria.decisionVariability * weights.decisionVariability) +
    (criteria.complexity * weights.complexity);

  const finalScore = Math.round((rawScore / 5) * 100);
  const category = determineCategory(finalScore);

  let reasoning = "";
  if (category === AutomationCategory.FullyAutomatable) {
    reasoning = "High frequency and consistent patterns make this ideal for full automation.";
  } else if (category === AutomationCategory.PartiallyAutomatable) {
    reasoning = "Automation can handle the repetitive parts, but human review is likely needed.";
  } else {
    reasoning = "Requires significant human judgment or deals with unstructured physical tasks.";
  }

  return {
    taskId: task.id,
    criteriaScores: criteria,
    finalScore,
    category,
    reasoning,
    automationAdvice: "",
    suggestedTools: generateTools(task, finalScore)
  };
};