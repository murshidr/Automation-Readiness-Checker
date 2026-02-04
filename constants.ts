import { Frequency } from './types';

export const DEPARTMENTS = [
  'Sales',
  'Operations',
  'Customer Service',
  'HR',
  'Finance',
  'Marketing',
  'IT',
  'Other'
];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  [Frequency.ManyTimesDaily]: 'Many times per day (50+)',
  [Frequency.DailyHigh]: 'Daily (10-50 times)',
  [Frequency.WeeklyMultiple]: 'Several times per week',
  [Frequency.Weekly]: 'Once a week',
  [Frequency.MonthlyOrLess]: 'Monthly or less',
};

export const DATA_INPUT_OPTIONS = [
  'Excel/Spreadsheets',
  'CRM (Salesforce, HubSpot)',
  'Email',
  'PDF Documents',
  'Web Forms',
  'Physical Paper',
  'Phone Calls/Verbal',
  'Database/API'
];

export const DATA_OUTPUT_OPTIONS = [
  'Excel/Spreadsheets',
  'Email Response',
  'SMS/Notification',
  'PDF Report',
  'Database Update',
  'Verbal Response'
];