// @ts-expect-error - lunar-javascript has no type declarations
import { Lunar } from 'lunar-javascript';

export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export type TimePeriod =
  | 'today'
  | 'tomorrow'
  | 'day-after-tomorrow'
  | 'next-week'
  | 'next-month'
  | 'next-3-months'
  | 'next-6-months'
  | 'next-year';

export interface DayGanzhi {
  date: string;
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
}

function getDateGanzhi(date: Date): DayGanzhi {
  const lunar = Lunar.fromDate(date);
  const yearGanZhi = lunar.getYearInGanZhi() as string;
  const monthGanZhi = lunar.getMonthInGanZhi() as string;
  const dayGanZhi = lunar.getDayInGanZhi() as string;

  const fmt = (s: string) => ({ gan: s[0], zhi: s.slice(1) });
  const y = fmt(yearGanZhi);
  const m = fmt(monthGanZhi);
  const d = fmt(dayGanZhi);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return {
    date: dateStr,
    yearGan: y.gan,
    yearZhi: y.zhi,
    monthGan: m.gan,
    monthZhi: m.zhi,
    dayGan: d.gan,
    dayZhi: d.zhi,
  };
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

function getMonthsInRange(start: Date, end: Date): DayGanzhi[] {
  const seen = new Set<string>();
  const result: DayGanzhi[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const g = getDateGanzhi(cur);
    const key = `${g.yearGan}${g.yearZhi}-${g.monthGan}${g.monthZhi}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(g);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function getGanzhiForPeriod(period: TimePeriod): DayGanzhi[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      return [getDateGanzhi(today)];
    case 'tomorrow':
      return [getDateGanzhi(addDays(today, 1))];
    case 'day-after-tomorrow':
      return [getDateGanzhi(addDays(today, 2))];
    case 'next-week': {
      const days: DayGanzhi[] = [];
      for (let i = 0; i < 7; i++) days.push(getDateGanzhi(addDays(today, i)));
      return days;
    }
    case 'next-month':
      return getMonthsInRange(today, addMonths(today, 1));
    case 'next-3-months':
      return getMonthsInRange(today, addMonths(today, 3));
    case 'next-6-months':
      return getMonthsInRange(today, addMonths(today, 6));
    case 'next-year':
      return getMonthsInRange(today, addMonths(today, 12));
    default:
      return [getDateGanzhi(today)];
  }
}

export function getCurrentDayun(
  dayunList: { gan: string; zhi: string; startYear: number; sortOrder: number }[]
): { gan: string; zhi: string; startYear: number } | null {
  if (!dayunList.length) return null;
  const sorted = [...dayunList].sort((a, b) => a.startYear - b.startYear);
  const currentYear = new Date().getFullYear();
  let current = sorted[0];
  for (const d of sorted) {
    if (d.startYear <= currentYear) current = d;
    else break;
  }
  return current;
}
