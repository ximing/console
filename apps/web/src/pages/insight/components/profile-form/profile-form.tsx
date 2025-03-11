import { useState } from 'react';
import { X } from 'lucide-react';
import { useService } from '@rabjs/react';
import { InsightService } from '../../insight.service';
import { DayunEditor } from './dayun-editor';
import type { InsightProfileDto, DayunInput } from '../../../../api/insight';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const data = { name: name.trim(), birthYear, ...fields, sortOrder: 0 };
    if (isEdit) {
      const ok = await service.updateProfile(profile.id, data);
      if (ok) await service.saveDayun(profile.id, dayunList);
    } else {
      const created = await service.createProfile(data);
      if (created) await service.saveDayun(created.id, dayunList);
    }
    setSaving(false);
    onClose();
  };

  const inputCls = 'w-12 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm px-2 py-1.5 text-center focus:outline-none focus:border-green-500 dark:focus:border-green-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? '编辑命主档案' : '新建命主档案'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
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
          <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">出生公历年份</label>
          <input
            type="number"
            className="w-32 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            value={birthYear}
            onChange={(e) => setBirthYear(parseInt(e.target.value) || 1990)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">八字（天干 / 地支）</label>
          <div className="grid grid-cols-4 gap-3">
            {GAN_ZHI_LABELS.map(({ label, ganKey, zhiKey }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-gray-400">{label}</span>
                <input
                  className={inputCls}
                  placeholder="干"
                  value={fields[ganKey]}
                  onChange={(e) => setFields((f) => ({ ...f, [ganKey]: e.target.value }))}
                  maxLength={2}
                />
                <input
                  className={inputCls}
                  placeholder="支"
                  value={fields[zhiKey]}
                  onChange={(e) => setFields((f) => ({ ...f, [zhiKey]: e.target.value }))}
                  maxLength={2}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 dark:border-zinc-800 pt-4">
          <DayunEditor value={dayunList} onChange={setDayunList} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
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
