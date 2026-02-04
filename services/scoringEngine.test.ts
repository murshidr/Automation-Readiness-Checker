import { describe, it, expect } from 'vitest';
import { scoreTask } from './scoringEngine';
import { Frequency, AutomationCategory } from '../types';
import type { TaskInput } from '../types';

describe('scoreTask', () => {
  const baseTask: TaskInput = {
    id: 'test-1',
    name: 'Test task',
    department: 'Operations',
    description: 'Same routine every day',
    frequency: Frequency.ManyTimesDaily,
    timePerTask: 10,
    inputs: ['Excel/Spreadsheets'],
    outputs: []
  };

  it('returns high score for high-frequency, repetitive, digital task', () => {
    const result = scoreTask(baseTask);
    expect(result.finalScore).toBeGreaterThanOrEqual(80);
    expect(result.category).toBe(AutomationCategory.FullyAutomatable);
    expect(result.criteriaScores.frequency).toBe(5);
    expect(result.reasoning).toBeTruthy();
    expect(result.suggestedTools.length).toBeGreaterThan(0);
  });

  it('returns lower score for monthly, low-repetitiveness task', () => {
    const task: TaskInput = {
      ...baseTask,
      frequency: Frequency.MonthlyOrLess,
      description: 'Different each time, creative strategic decisions'
    };
    const result = scoreTask(task);
    expect(result.finalScore).toBeLessThan(80);
    expect(result.criteriaScores.frequency).toBe(1);
  });

  it('uses data inputs and outputs in dataDependency', () => {
    const task: TaskInput = {
      ...baseTask,
      inputs: ['Database/API'],
      outputs: ['Database Update']
    };
    const result = scoreTask(task);
    expect(result.criteriaScores.dataDependency).toBeGreaterThanOrEqual(4);
  });

  it('accepts custom weights', () => {
    const result = scoreTask(baseTask, {
      frequency: 0.5,
      repetitiveness: 0.2,
      dataDependency: 0.1,
      decisionVariability: 0.1,
      complexity: 0.1
    });
    expect(result.taskId).toBe(baseTask.id);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
  });

  it('classifies score >= 80 as FullyAutomatable', () => {
    const task: TaskInput = {
      ...baseTask,
      frequency: Frequency.ManyTimesDaily,
      description: 'Same template copy repeat always',
      inputs: ['Excel/Spreadsheets', 'CRM (Salesforce, HubSpot)'],
      outputs: ['Excel/Spreadsheets']
    };
    const result = scoreTask(task);
    expect(result.category).toBe(AutomationCategory.FullyAutomatable);
  });

  it('classifies low-frequency, high-judgment, analog task as not fully automatable', () => {
    const task: TaskInput = {
      ...baseTask,
      frequency: Frequency.MonthlyOrLess,
      description: 'Unique creative strategic negotiate case by case decide evaluate',
      inputs: ['Phone Calls/Verbal', 'Physical Paper'],
      outputs: ['Verbal Response']
    };
    const result = scoreTask(task);
    expect(result.category).not.toBe(AutomationCategory.FullyAutomatable);
    expect(result.finalScore).toBeLessThan(80);
  });
});
