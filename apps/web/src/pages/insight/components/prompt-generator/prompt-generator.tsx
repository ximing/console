import { useState } from 'react';
import { Copy, Check, Wand2 } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { BaziDisplay } from '../bazi-display';
import { buildPrompt, TIME_PERIOD_LABELS, PRESET_ASPECTS } from '../../utils/prompt-builder';
import { getCurrentDayun } from '../../utils/ganzhi';
import type { TimePeriod } from '../../utils/ganzhi';

const TIME_PERIODS = Object.keys(TIME_PERIOD_LABELS) as TimePeriod[];

export const PromptGenerator = view(() => {
  const service = useService(InsightService);
  const profile = service.selectedProfile;

  const [period, setPeriod] = useState<TimePeriod>('today');
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [customAspect, setCustomAspect] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const allAspects = [...PRESET_ASPECTS, ...(profile?.customAspects ?? [])];

  const toggleAspect = (aspect: string) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  const handleGenerate = () => {
    if (!profile) return;
    setPrompt(buildPrompt(profile, period, selectedAspects));
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

  const dayun = getCurrentDayun(profile.dayunList);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-zinc-200">{profile.name}</h2>
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
        {dayun ? (
          <p className="text-xs text-gray-500 dark:text-zinc-500">
            当前大运：<span className="text-green-600 dark:text-green-400 font-medium">{dayun.gan}{dayun.zhi}</span>
            （{dayun.startYear}年起）
          </p>
        ) : (
          <p className="text-xs text-gray-400">尚未录入大运</p>
        )}
      </div>

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

      <button
        onClick={handleGenerate}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-medium text-sm hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
      >
        <Wand2 className="w-4 h-4" />
        生成 Prompt
      </button>

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
