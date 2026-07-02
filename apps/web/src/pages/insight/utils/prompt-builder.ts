import type { InsightProfileDto } from '../../../api/insight';
import type { TimePeriod } from './ganzhi';
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


function buildBaziSection(profile: InsightProfileDto): string {
  const gans = [profile.yearGan, profile.monthGan, profile.dayGan, profile.hourGan];
  const zhis = [profile.yearZhi, profile.monthZhi, profile.dayZhi, profile.hourZhi];
  const details = [profile.yearDetail, profile.monthDetail, profile.dayDetail, profile.hourDetail];
  const labels = ['年', '月', '日', '时'];
  const hasDetail = details.some(Boolean);

  if (!hasDetail) {
    return `  天干：${gans.join('  ')}
  地支：${zhis.join('  ')}`;
  }

  const shishenRow = labels.map((l, i) => `${l}(${details[i]?.shishen_gan ?? '—'})`).join('  ');
  const ganRow = labels.map((l, i) => `${l}干：${gans[i]}`).join('  ');
  const zhiRow = labels.map((l, i) => `${l}支：${zhis[i]}`).join('  ');

  let section = `  主星：${shishenRow}
  ${ganRow}
  ${zhiRow}`;

  const nayinParts = details.map((d, i) => d?.nayin ? `${labels[i]}(${d.nayin})` : null).filter(Boolean);
  if (nayinParts.length > 0) section += `\n  纳音：${nayinParts.join('  ')}`;

  const xiyunParts = details.map((d, i) => d?.xiyun ? `${labels[i]}(${d.xiyun})` : null).filter(Boolean);
  if (xiyunParts.length > 0) section += `\n  星运：${xiyunParts.join('  ')}`;

  const cangganLines = details.map((d, i) => {
    if (!d?.canggan?.length) return null;
    const cg = d.canggan.map(c => `${c.gan}${c.shishen ? `(${c.shishen})` : ''}`).join(' ');
    return `    ${labels[i]}${zhis[i]}：${cg}`;
  }).filter(Boolean);
  if (cangganLines.length > 0) section += `\n  藏干十神：\n${cangganLines.join('\n')}`;

  const shenshasLines = details.map((d, i) => {
    if (!d?.shenshas?.length) return null;
    return `    ${labels[i]}柱：${d.shenshas.join(' ')}`;
  }).filter(Boolean);
  if (shenshasLines.length > 0) section += `\n  神煞：\n${shenshasLines.join('\n')}`;

  return section;
}

export function buildPrompt(
  profile: InsightProfileDto,
  period: TimePeriod,
  aspects: string[],
  macroAnalysis?: string
): string {
  const dayun = getCurrentDayun(profile.dayunList);
  const ganzhiList = getGanzhiForPeriod(period);
  const periodLabel = TIME_PERIOD_LABELS[period];
  const isShortPeriod = SHORT_PERIODS.includes(period);
  const aspectLine = aspects.length > 0 ? aspects.join('、') : '综合运势';

  // 命主信息
  const birthInfo = profile.birthDate
    ? `阳历生日：${profile.birthDate}${profile.birthTime ? ' ' + profile.birthTime : ''}`
    : '';
  const dayunLine = dayun
    ? `当前大运：${dayun.gan}${dayun.zhi}（${dayun.startYear}年起）`
    : '当前大运：（请 AI 根据出生信息推算目前所处的大运干支，若无法精确推算，请重点分析原局与流年流月的关系）';

  // 时间背景
  const g = ganzhiList[0];
  const yearGz = `${g.yearGan}${g.yearZhi}`;
  const monthGz = `${g.monthGan}${g.monthZhi}`;

  let timeBackground: string;
  let part2TimeDesc: string;
  let part3Label: string;

  if (isShortPeriod) {
    const dayGz = `${g.dayGan}${g.dayZhi}`;
    timeBackground = `流年：${yearGz}\n流月：${monthGz}\n流日：${dayGz}`;
    part2TimeDesc = `流年(${yearGz})、流月(${monthGz})、流日(${dayGz})`;
    part3Label = periodLabel;
  } else if (period === WEEK_PERIOD) {
    const dayLines = ganzhiList.map((d) => `  ${d.date}  流日：${d.dayGan}${d.dayZhi}`).join('\n');
    timeBackground = `流年：${yearGz}\n流月：${monthGz}\n未来七日流日：\n${dayLines}`;
    part2TimeDesc = `流年(${yearGz})、流月(${monthGz})`;
    part3Label = periodLabel;
  } else {
    const monthLines = ganzhiList.map(
      (m) => `  ${m.date.slice(0, 7)}  流年：${m.yearGan}${m.yearZhi}  流月：${m.monthGan}${m.monthZhi}`
    ).join('\n');
    timeBackground = `流年：${yearGz}\n${monthLines}`;
    part2TimeDesc = `流年(${yearGz})及各流月`;
    part3Label = periodLabel;
  }

  const part1 = macroAnalysis
    ? `## 第一部分：原局宏观拆解（已有分析，无需重复）\n${macroAnalysis}`
    : `## 第一部分：原局宏观拆解（四大流派独立分析）
请勿强行统一结论，如实呈现各派分歧：
1. 子平法：判定正格或变格，分析格局的清浊成败，取用神与喜忌。
2. 旺衰派：分析日主的客观旺衰（得令、得地、得势情况），判断是扶弱还是抑强，明确喜、用、忌、仇五行。
3. 调候派：结合月令气候特点，判断命局寒暖燥湿，提取调候用神。
4. 盲派（重点防混淆）：严格摒弃旺衰逻辑。明确划分"宾主"与"体用"；分析主要做功神与废神；阐述各字之间的做功方式与效率（谁在做功？用什么方式制/化？效率高低？）。`;

  return `# 角色设定
你是一位精通中国传统命理学的八字大师，深谙子平法、旺衰派、调候派及盲派命理，能够客观、严谨地拆解八字，并提供切实可行的建议。请严格按照要求，各流派分别论述，切勿将不同流派的理论混杂（例如不要在盲派分析中谈论日主旺衰），各流派有分歧之处如实呈现，不强行统一。

# 命主信息
【八字原局】
${buildBaziSection(profile)}
${birthInfo ? birthInfo + '\n' : ''}【${dayunLine}】

# 时间背景 - ${periodLabel}
${timeBackground}

# 分析框架与执行路径

${part1}

## 第二部分：五行刑冲合害与气势流通（动态分析）
- 剖析原局地支之间的刑冲合害关系。
- 重点分析：${part2TimeDesc} 的介入，对原局产生了哪些具体的"引动"（如刑冲合害破、暗合、墓库开启等）？
- 生克制化：五行生克是否有情，制化是否得力。
- 命局整体气势是否流通顺畅，${periodLabel}有无郁结滞塞之处。

## 第三部分：${part3Label}专属运势与行动建议
请结合上述所有分析，聚焦【${aspectLine}】维度，输出针对"${part3Label}"的具体指导：
1. 运势吉凶断言：基于流年流月${isShortPeriod ? '流日' : ''}对原局的引动，${part3Label}在以上方面最可能发生什么具体表象？各派结论如有出入，请分别列出。
2. 实操建议：给出具体、可执行的行动建议。各派结论如有出入，分别列出供参考，不必回避分歧。`;
}
