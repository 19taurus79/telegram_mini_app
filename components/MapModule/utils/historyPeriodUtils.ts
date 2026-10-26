export type HistoryPeriodId = '3days' | '7days' | '30days' | 'season' | 'year' | 'all' | 'custom';

export interface HistoryPeriodOption {
  id: HistoryPeriodId;
  label: string;
  days: number | null;
}

export const HISTORY_PERIODS: HistoryPeriodOption[] = [
  { id: '3days', label: '3 дні', days: 3 },
  { id: '7days', label: '7 днів', days: 7 },
  { id: '30days', label: 'Місяць', days: 30 },
  { id: 'season', label: 'Сезон (90 д.)', days: 90 },
  { id: 'year', label: 'Рік (365 д.)', days: 365 },
  { id: 'all', label: 'За весь час', days: null },
  { id: 'custom', label: 'Діапазон...', days: null },
];

export function getDatesForHistoryPeriod(
  period: HistoryPeriodId = '7days',
  customFrom = '',
  customTo = ''
): { date_from?: string; date_to?: string } {
  if (period === 'all') {
    return {};
  }
  if (period === 'custom') {
    return {
      date_from: customFrom || undefined,
      date_to: customTo || undefined,
    };
  }

  const found = HISTORY_PERIODS.find(p => p.id === period);
  const days = found?.days ?? 7;

  const today = new Date();
  const fromDate = new Date();
  fromDate.setDate(today.getDate() - days);

  const format = (d: Date): string => d.toISOString().split('T')[0];

  return {
    date_from: format(fromDate),
    date_to: format(today),
  };
}
