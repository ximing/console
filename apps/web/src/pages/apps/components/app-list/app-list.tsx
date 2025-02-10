import { useState, useEffect, useCallback } from 'react';
import { view } from '@rabjs/react';
import { AppListHeader } from './app-list-header';
import { AppListContent } from './app-list-content';
import { AppModal } from './app-modal';
import { useAppList } from './hooks/useAppList';
import type { AppDto, CreateAppDto, UpdateAppDto } from '@x-console/dto';

export const AppList = view(() => {
  const { apps, loading, loadApps, createApp, updateApp, deleteApp, navigateToVersions } = useAppList();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingApp, setEditingApp] = useState<AppDto | null>(null);

  // Load apps on mount
  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleOpenCreateModal = () => {
    setEditingApp(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (app: AppDto) => {
    setEditingApp(app);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingApp(null);
  };

  const handleSaveApp = useCallback(async (data: CreateAppDto | UpdateAppDto) => {
    if (editingApp) {
      await updateApp(editingApp.id, data);
    } else {
      await createApp(data as CreateAppDto);
    }
  }, [editingApp, createApp, updateApp]);

  const handleDeleteApp = useCallback(async (app: AppDto) => {
    await deleteApp(app.id);
  }, [deleteApp]);

  const handleViewVersions = useCallback((appId: string) => {
    navigateToVersions(appId);
  }, [navigateToVersions]);

  return (
    <div className="flex flex-col h-full px-6 py-5">
      <AppListHeader onCreateApp={handleOpenCreateModal} />

      <AppListContent
        apps={apps}
        loading={loading}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteApp}
        onViewVersions={handleViewVersions}
      />

      <AppModal
        visible={modalVisible}
        app={editingApp}
        onClose={handleCloseModal}
        onSave={handleSaveApp}
      />
    </div>
  );
});
