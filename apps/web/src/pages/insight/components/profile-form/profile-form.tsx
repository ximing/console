import { useState } from 'react';
import { X } from 'lucide-react';
import { useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { DayunEditor } from './dayun-editor';
import type { InsightProfileDto, DayunInput, ParsedBaziResult } from '../../../../api/insight';
import { insightApi } from '../../../../api/insight';
import { TIAN_GAN, DI_ZHI } from '../../utils/ganzhi';

interface ProfileFormProps {
  profile?: InsightProfileDto;
  onClose: () => void;
}

const GAN_ZHI_LABELS = [
  { label: '年柱', ganKey: 'yearGan', zhiKey: 'yearZhi' },
  { label: '月柱', ganKey: 'monthGan', zhiKey: 'monthZhi' },
  { label: '日柱', ganKey: 'dayGan', zhiKey: 'dayZhi' },
  { label: '时柱', ganKey: 'hourGan', zhiKey: 'hourZhi' },
] as const;

type FieldKey = 'yearGan' | 'yearZhi' | 'monthGan' | 'monthZhi' | 'dayGan' | 'dayZhi' | 'hourGan' | 'hourZhi';

export function ProfileForm({ profile, onClose }: ProfileFormProps) {
  const service = useService(InsightService);
  const isEdit = !!profile;

  const [name, setName] = useState(profile?.name ?? '');
  const [birthYear, setBirthYear] = useState(profile?.birthYear ?? new Date().getFullYear() - 30);
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  const [birthTime, setBirthTime] = useState(profile?.birthTime ?? '');
  const [fields, setFields] = useState<Record<FieldKey, string>>({
    yearGan: profile?.yearGan ?? '',
    yearZhi: profile?.yearZhi ?? '',
    monthGan: profile?.monthGan ?? '',
    monthZhi: profile?.monthZhi ?? '',
    dayGan: profile?.dayGan ?? '',
    dayZhi: profile?.dayZhi ?? '',
    hourGan: profile?.hourGan ?? '',
    hourZhi: profile?.hourZhi ?? '',
  });
  const [dayunList, setDayunList] = useState<DayunInput[]>(
    profile?.dayunList?.map((d) => ({ gan: d.gan, zhi: d.zhi, startYear: d.startYear, sortOrder: d.sortOrder })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [parsedDetails, setParsedDetails] = useState<Partial<ParsedBaziResult> | null>(null);

  // AI录入 state
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiParsing(true);
    setAiError('');
    try {
      const result = await insightApi.parseBazi(aiText);
      setFields({
        yearGan: result.yearGan ?? '',
        yearZhi: result.yearZhi ?? '',
        monthGan: result.monthGan ?? '',
        monthZhi: result.monthZhi ?? '',
        dayGan: result.dayGan ?? '',
        dayZhi: result.dayZhi ?? '',
        hourGan: result.hourGan ?? '',
        hourZhi: result.hourZhi ?? '',
      });
      if (result.birthYear) setBirthYear(result.birthYear);
      if (result.birthDate) setBirthDate(result.birthDate);
      if (result.birthTime) setBirthTime(result.birthTime);
      setParsedDetails(result);
      setShowAiInput(false);
      setAiText('');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI解析失败，请重试');
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const data = {
      name: name.trim(),
      birthYear,
      birthDate: birthDate || null,
      birthTime: birthTime || null,
      ...fields,
      yearDetail: parsedDetails?.yearDetail ?? profile?.yearDetail ?? null,
      monthDetail: parsedDetails?.monthDetail ?? profile?.monthDetail ?? null,
      dayDetail: parsedDetails?.dayDetail ?? profile?.dayDetail ?? null,
      hourDetail: parsedDetails?.hourDetail ?? profile?.hourDetail ?? null,
      shenshas: parsedDetails?.shenshas ?? profile?.shenshas ?? null,
      customAspects: profile?.customAspects ?? null,
      sortOrder: profile?.sortOrder ?? 0,
    };
    let success = false;
    if (isEdit) {
      const ok = await service.updateProfile(profile.id, data);
      if (ok) {
        await service.saveDayun(profile.id, dayunList);
        success = true;
      }
    } else {
      const created = await service.createProfile(data);
      if (created) {
        await service.saveDayun(created.id, dayunList);
        success = true;
      }
    }
    setSaving(false);
    if (success) onClose();
  };

  const selectCls = 'w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-1 py-1.5 text-center focus:outline-none focus:border-green-500 dark:focus:border-green-400';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <form
        onSubmit={handleSubmit}
        className="animate-slide-in-right relative flex flex-col h-full w-[480px] max-w-full bg-white dark:bg-zinc-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? '编辑命主档案' : '新建命主档案'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* AI录入 section */}
          <div className="border border-dashed border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAiInput(!showAiInput)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="font-medium">AI 录入</span>
              <span className="text-xs">{showAiInput ? '收起' : '粘贴八字排盘文字自动填入'}</span>
            </button>
            {showAiInput && (
              <div className="px-3 pb-3 space-y-2">
                <textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="粘贴八字排盘文字..."
                  rows={8}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none font-mono"
                />
                {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                <button
                  type="button"
                  onClick={handleAiParse}
                  disabled={aiParsing || !aiText.trim()}
                  className="px-4 py-1.5 text-sm rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white disabled:opacity-50 transition-all"
                >
                  {aiParsing ? '解析中...' : '解析'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">命主名称</label>
            <input
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              placeholder="如：自己、妈妈、老公"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">出生日期 / 时间</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={birthDate ?? ''}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  if (e.target.value) setBirthYear(new Date(e.target.value).getFullYear());
                }}
                className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
              <input
                type="time"
                value={birthTime ?? ''}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-32 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">八字（天干 / 地支）</label>
            <div className="grid grid-cols-4 gap-3">
              {GAN_ZHI_LABELS.map(({ label, ganKey, zhiKey }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <span className="text-xs text-gray-400">{label}</span>
                  <select
                    className={selectCls}
                    value={fields[ganKey]}
                    onChange={(e) => setFields((f) => ({ ...f, [ganKey]: e.target.value }))}
                  >
                    <option value="">干</option>
                    {TIAN_GAN.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select
                    className={selectCls}
                    value={fields[zhiKey]}
                    onChange={(e) => setFields((f) => ({ ...f, [zhiKey]: e.target.value }))}
                  >
                    <option value="">支</option>
                    {DI_ZHI.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 dark:border-zinc-800 pt-4">
            <DayunEditor value={dayunList} onChange={setDayunList} />
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white text-sm font-medium hover:-translate-y-0.5 transition-all duration-150 shadow-[0_2px_8px_rgba(34,197,94,0.3)] disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
