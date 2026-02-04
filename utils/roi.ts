import { Frequency } from '../types';

/** Approximate occurrences per month for ROI calculation */
function monthlyOccurrences(freq: Frequency): number {
  switch (freq) {
    case Frequency.ManyTimesDaily: return 50 * 22;
    case Frequency.DailyHigh: return 30 * 22;
    case Frequency.WeeklyMultiple: return 12;
    case Frequency.Weekly: return 4;
    case Frequency.MonthlyOrLess: return 1;
    default: return 4;
  }
}

export interface TaskROIInput {
  timePerTask: number;
  frequency: Frequency;
  finalScore: number;
}

/**
 * Estimated monthly value (USD) from automating this task.
 * @param task - task + score info
 * @param hourlyRate - rate in USD per hour; if null, returns 0
 */
export function estimateMonthlyValue(
  task: TaskROIInput,
  hourlyRate: number | null
): number {
  if (hourlyRate == null || hourlyRate <= 0) return 0;
  const occurrences = monthlyOccurrences(task.frequency);
  const savedMins = occurrences * task.timePerTask * (task.finalScore / 100);
  const savedHours = savedMins / 60;
  return savedHours * hourlyRate;
}

/**
 * Estimated monthly time saved (in hours) from automating this task.
 * @param task - task + score info
 * @returns hours saved per month
 */
export function estimateMonthlyTimeSaved(task: TaskROIInput): number {
  const occurrences = monthlyOccurrences(task.frequency);
  const savedMins = occurrences * task.timePerTask * (task.finalScore / 100);
  return savedMins / 60; // Return hours
}
