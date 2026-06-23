import type { InsightProfileDto } from '../../../api/insight';
import type { TimePeriod, DayGanzhi } from './ganzhi';
import { getGanzhiForPeriod, getCurrentDayun } from './ganzhi';

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  'today': '今天',
  'tomorrow': '明天',
  'day-after-tomorrow': '后天',
  'next-week': '未来一周',
  'next-month': '未来一个月',
  'next-3-months': '未来三个月',
  'next-6-months': '未来半年',
  'next-year': '未来一年',
};

export const PRESET_ASPECTS = [
  '事业', '财富', '感情婚姻', '健康', '学业',
  '家庭', '子女', '父母', '出行', '贵人',
  '官非诉讼', '住宅置业', '名誉声望',
];

const SHORT_PERIODS: TimePeriod[] = ['today', 'tomorrow', 'day-after-tomorrow'];
const WEEK_PERIOD: TimePeriod = 'next-week';

function formatDay(g: DayGanzhi): string {
  return `流年：天干 ${g.yearGan}，地支 ${g.yearZhi}\n流月：天干 ${g.monthGan}，地支 ${g.monthZhi}\n流日：天干 ${g.dayGan}，地支 ${g.dayZhi}`;
}

function formatWeek(days: DayGanzhi[]): string {
  const header = `流年：天干 ${days[0].yearGan}，地支 ${days[0].yearZhi}\n流月：天干 ${days[0].monthGan}，地支 ${days[0].monthZhi}`;
  const dayLines = days
    .map((d) => `  ${d.date}  流日：天干 ${d.dayGan}，地支 ${d.dayZhi}`)
    .join('\n');
  return `${header}\n未来七日流日：\n${dayLines}`;
}

function formatMonths(months: DayGanzhi[]): string {
  const lines = months.map(
    (m) => `  ${m.date.slice(0, 7)}  流年：天干 ${m.yearGan}，地支 ${m.yearZhi}  流月：天干 ${m.monthGan}，地支 ${m.monthZhi}`
  );
  return lines.join('\n');
}

export function buildPrompt(
  profile: InsightProfileDto,
  period: TimePeriod,
  aspects: string[]
): string {
  const dayun = getCurrentDayun(profile.dayunList);
  const ganzhiList = getGanzhiForPeriod(period);
  const periodLabel = TIME_PERIOD_LABELS[period];

  let timeSection: string;
  if (SHORT_PERIODS.includes(period)) {
    timeSection = formatDay(ganzhiList[0]);
  } else if (period === WEEK_PERIOD) {
    timeSection = formatWeek(ganzhiList);
  } else {
    timeSection = formatMonths(ganzhiList);
  }

  const dayunLine = dayun
    ? `当前大运：天干 ${dayun.gan}，地支 ${dayun.zhi}（${dayun.startYear}年起）`
    : '当前大运：未录入';

  const aspectLine = aspects.length > 0 ? aspects.join('、') : '综合运势';

  return `【命主信息】
八字：
  天干：${profile.yearGan}  ${profile.monthGan}  ${profile.dayGan}  ${profile.hourGan}
  地支：${profile.yearZhi}  ${profile.monthZhi}  ${profile.dayZhi}  ${profile.hourZhi}
${dayunLine}

【时间背景 - ${periodLabel}】
${timeSection}

【分析请求】
请结合八字原局、当前大运、流年流月流日，重点从以下方面进行详细分析和建议：
${aspectLine}

时间范围：${periodLabel}
请给出具体、有操作性的分析和行动建议。`;
}
