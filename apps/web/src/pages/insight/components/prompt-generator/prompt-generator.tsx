import { useState } from 'react';
import { Copy, Check, Wand2 } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { BaziDisplay } from '../bazi-display';
import { buildPrompt, buildOutfitPrompt, buildFengShuiPrompt, TIME_PERIOD_LABELS, PRESET_ASPECTS } from '../../utils/prompt-builder';
import type { SpecialMode } from '../../utils/prompt-builder';
import { getCurrentDayun } from '../../utils/ganzhi';
import type { TimePeriod } from '../../utils/ganzhi';

const TIME_PERIODS = Object.keys(TIME_PERIOD_LABELS) as TimePeriod[];

const SPECIAL_MODES: { value: SpecialMode; label: string }[] = [
  { value: 'custom', label: '自定义专项' },
  { value: 'outfit', label: '五行穿搭/佩戴' },
  { value: 'fengshui', label: '风水理气与峦头' },
];

export const PromptGenerator = view(() => {
  const service = useService(InsightService);
  const profile = service.selectedProfile;

  const [specialMode, setSpecialMode] = useState<SpecialMode>('custom');
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [customAspect, setCustomAspect] = useState('');
  const [feixing, setFeixing] = useState('');
  const [demand, setDemand] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedDayunYear, setCopiedDayunYear] = useState<number | null>(null);
  const [copiedAllDayun, setCopiedAllDayun] = useState(false);
  const [showSaveAnalysis, setShowSaveAnalysis] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [saveAnalysisError, setSaveAnalysisError] = useState<string | null>(null);

  const copyDayun = async (gan: string, zhi: string, startYear: number) => {
    await navigator.clipboard.writeText(`${gan}${zhi}`);
    setCopiedDayunYear(startYear);
    setTimeout(() => setCopiedDayunYear(null), 1500);
  };

  const copyAllDayun = async (list: { gan: string; zhi: string; startYear: number }[]) => {
    const text = list.map((d, i) => {
      const end = list[i + 1] ? list[i + 1].startYear - 1 : '…';
      return `${d.gan}${d.zhi}(${d.startYear}-${end})`;
    }).join(' ');
    await navigator.clipboard.writeText(text);
    setCopiedAllDayun(true);
    setTimeout(() => setCopiedAllDayun(false), 1500);
  };

  const allAspects = [...PRESET_ASPECTS, ...(profile?.customAspects ?? [])];

  const toggleAspect = (aspect: string) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  const handleGenerate = () => {
    if (!profile) return;
    if (specialMode === 'outfit') {
      setPrompt(buildOutfitPrompt(profile, profile.macroAnalysis ?? undefined));
    } else if (specialMode === 'fengshui') {
      setPrompt(buildFengShuiPrompt(feixing, demand));
    } else {
      setPrompt(buildPrompt(profile, period, selectedAspects, profile.macroAnalysis ?? undefined));
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCustomAspect = async () => {
    const val = customAspect.trim();
    if (!val || !profile) return;
    const next = [...(profile.customAspects ?? []), val];
    const ok = await service.updateProfile(profile.id, { customAspects: next });
    if (ok) setCustomAspect('');
  };

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-zinc-600 text-sm">
        请先在左栏选择或新建命主档案
      </div>
    );
  }

  const currentDayun = getCurrentDayun(profile.dayunList);
  const sortedDayun = [...profile.dayunList].sort((a, b) => a.startYear - b.startYear);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-800 dark:text-zinc-200">{profile.name}</h2>
        {profile.macroAnalysis && specialMode !== 'fengshui' && (
          <span
            title="已保存原局宏观拆解，生成 Prompt 时将自动使用"
            className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded"
          >
            ✓ 已有原局分析
          </span>
        )}
      </div>

      {/* Mode selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">专项模式</label>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => { setSpecialMode(m.value); setPrompt(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                specialMode === m.value
                  ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bazi + dayun — hidden for fengshui mode */}
      {specialMode !== 'fengshui' && (
        <div className="space-y-3">
          <BaziDisplay
            yearGan={profile.yearGan} yearZhi={profile.yearZhi}
            monthGan={profile.monthGan} monthZhi={profile.monthZhi}
            dayGan={profile.dayGan} dayZhi={profile.dayZhi}
            hourGan={profile.hourGan} hourZhi={profile.hourZhi}
            yearDetail={profile.yearDetail}
            monthDetail={profile.monthDetail}
            dayDetail={profile.dayDetail}
            hourDetail={profile.hourDetail}
          />
          {sortedDayun.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">大运</p>
                <button
                  type="button"
                  onClick={() => copyAllDayun(sortedDayun)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {copiedAllDayun ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedAllDayun ? '已复制' : '复制全部'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sortedDayun.map((d, i) => {
                  const isCurrent = currentDayun?.startYear === d.startYear;
                  const endYear = sortedDayun[i + 1] ? sortedDayun[i + 1].startYear - 1 : '…';
                  return (
                    <button
                      key={d.startYear}
                      type="button"
                      onClick={() => copyDayun(d.gan, d.zhi, d.startYear)}
                      title="点击复制"
                      className={`flex flex-col items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer hover:opacity-80 active:scale-95 ${
                        isCurrent
                          ? 'bg-green-100 dark:bg-green-900/30 ring-1 ring-green-400/60'
                          : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                      }`}
                    >
                      <span className={`text-sm font-semibold leading-tight ${isCurrent ? 'text-green-700 dark:text-green-300' : ''}`}>
                        {copiedDayunYear === d.startYear ? <Check className="w-3.5 h-3.5 text-green-500" /> : `${d.gan}${d.zhi}`}
                      </span>
                      <span className={`text-[10px] leading-tight mt-0.5 ${isCurrent ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-zinc-500'}`}>
                        {d.startYear}–{endYear}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-0.5">当前</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">尚未录入大运</p>
          )}
        </div>
      )}

      {/* Custom mode: time period + aspects */}
      {specialMode === 'custom' && (
        <>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">分析时间范围</label>
            <div className="flex flex-wrap gap-2">
              {TIME_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    period === p
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400'
                  }`}
                >
                  {TIME_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
              分析方向（可多选，不选则综合运势）
            </label>
            <div className="flex flex-wrap gap-2">
              {allAspects.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAspect(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                    selectedAspects.includes(a)
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
                placeholder="添加自定义方向（如：移民、创业）"
                value={customAspect}
                onChange={(e) => setCustomAspect(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAspect()}
              />
              <button
                onClick={handleAddCustomAspect}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs text-gray-600 dark:text-zinc-400 hover:text-green-600 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </>
      )}

      {/* Outfit mode: brief description */}
      {specialMode === 'outfit' && (
        <p className="text-xs text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 leading-relaxed">
          将基于八字原局与今日干支，生成涵盖<strong className="text-gray-700 dark:text-zinc-300">本日、最近7天、本月</strong>三个维度的穿搭配色、首饰佩戴及行动建议。
          {profile.macroAnalysis ? '已有原局分析将嵌入第一部分，AI 直接续析流年流月流日。' : '未保存原局分析，AI 将自行推演。'}
        </p>
      )}

      {/* Fengshui mode: optional inputs */}
      {specialMode === 'fengshui' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
              玄空飞星 <span className="text-gray-400 dark:text-zinc-500 font-normal">（选填）</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-green-500 font-mono leading-relaxed resize-none"
              rows={4}
              placeholder="填入本年/本月/本日九宫飞星方位，不填则仅基于四象法布局"
              value={feixing}
              onChange={(e) => setFeixing(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
              核心诉求 <span className="text-gray-400 dark:text-zinc-500 font-normal">（选填）</span>
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
              placeholder="如：求事业、求财、求学、求健康，不填则做常规吉凶布局"
              value={demand}
              onChange={(e) => setDemand(e.target.value)}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-medium text-sm hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
      >
        <Wand2 className="w-4 h-4" />
        生成 Prompt
      </button>

      {/* Save analysis — only for bazi-based modes */}
      {specialMode !== 'fengshui' && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setAnalysisText(profile.macroAnalysis ?? '');
              setSaveAnalysisError(null);
              setShowSaveAnalysis((v) => !v);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm text-gray-600 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            {showSaveAnalysis ? '收起' : '保存原局分析'}
          </button>

          {showSaveAnalysis && (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-xs text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-green-500 font-mono leading-relaxed resize-none"
                rows={10}
                placeholder="粘贴 AI 返回的第一部分分析内容（原局宏观拆解）..."
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
              />
              {saveAnalysisError && (
                <p className="text-xs text-red-500">{saveAnalysisError}</p>
              )}
              <button
                type="button"
                disabled={savingAnalysis}
                onClick={async () => {
                  setSavingAnalysis(true);
                  setSaveAnalysisError(null);
                  const ok = await service.updateProfile(profile.id, {
                    macroAnalysis: analysisText.trim() || null,
                  });
                  setSavingAnalysis(false);
                  if (ok) {
                    setShowSaveAnalysis(false);
                  } else {
                    setSaveAnalysisError('保存失败，请重试');
                  }
                }}
                className="w-full py-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingAnalysis ? '保存中…' : '保存'}
              </button>
            </div>
          )}
        </div>
      )}

      {prompt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
              生成的 Prompt（复制后粘贴到 ChatGPT）
            </label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs text-gray-600 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="w-full rounded-xl bg-gray-50 dark:bg-zinc-800/50 p-4 text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed border border-gray-100 dark:border-zinc-700/50">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
});
