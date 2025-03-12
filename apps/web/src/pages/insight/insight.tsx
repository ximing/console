import { useState, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { InsightService } from './insight.service';
import { ProfileList } from './components/profile-list';
import { ProfileForm } from './components/profile-form';
import { PromptGenerator } from './components/prompt-generator';
import type { InsightProfileDto } from '../../api/insight';

export const InsightPage = view(() => {
  const service = useService(InsightService);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<InsightProfileDto | undefined>(undefined);

  useEffect(() => {
    service.loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => { setEditingProfile(undefined); setShowForm(true); };
  const openEdit = (p: InsightProfileDto) => { setEditingProfile(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingProfile(undefined); };

  return (
    <Layout>
      <div className="flex h-full">
        <aside
          className="w-[240px] flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-zinc-800"
          style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.04)' }}
        >
          <ProfileList onAdd={openAdd} onEdit={openEdit} />
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl">
            <h1 className="text-base font-semibold text-gray-800 dark:text-zinc-200">不惑 · Insight</h1>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              根据八字大运生成分析 Prompt，复制后粘贴至 ChatGPT
            </p>
          </div>
          <PromptGenerator />
        </div>
      </div>

      {showForm && (
        <ProfileForm profile={editingProfile} onClose={closeForm} />
      )}
    </Layout>
  );
});
