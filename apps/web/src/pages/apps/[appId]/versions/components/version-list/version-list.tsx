import { useState, useEffect, useCallback } from 'react';
import { view } from '@rabjs/react';
import { VersionListHeader } from './version-list-header';
import { VersionListContent } from './version-list-content';
import { VersionModal } from './version-modal';
import { QRModal } from './qr-modal';
import { useVersionList } from './hooks/useVersionList';
import type { AppVersionDto, CreateVersionDto, UpdateVersionDto } from '@x-console/dto';
import type { AppDto } from '@x-console/dto';

export const VersionList = view(() => {
  const { versions, loading, loadVersions, loadApp, createVersion, updateVersion, deleteVersion, navigateBack } = useVersionList();

  const [app, setApp] = useState<AppDto | null>(null);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersionDto | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<AppVersionDto | null>(null);

  // Load app and versions on mount
  useEffect(() => {
    const init = async () => {
      const loadedApp = await loadApp();
      if (loadedApp) {
        setApp(loadedApp);
      }
      await loadVersions();
    };
    init();
  }, [loadApp, loadVersions]);

  const handleOpenCreateModal = () => {
    setEditingVersion(null);
    setVersionModalVisible(true);
  };

  const handleOpenEditModal = (version: AppVersionDto) => {
    setEditingVersion(version);
    setVersionModalVisible(true);
  };

  const handleCloseVersionModal = () => {
    setVersionModalVisible(false);
    setEditingVersion(null);
  };

  const handleShowQR = (version: AppVersionDto) => {
    setSelectedVersion(version);
    setQrModalVisible(true);
  };

  const handleCloseQRModal = () => {
    setQrModalVisible(false);
    setSelectedVersion(null);
  };

  const handleSaveVersion = useCallback(async (data: CreateVersionDto | UpdateVersionDto) => {
    if (editingVersion) {
      await updateVersion(editingVersion.id, data);
    } else {
      await createVersion(data as CreateVersionDto);
    }
  }, [editingVersion, createVersion, updateVersion]);

  const handleDeleteVersion = useCallback(async (version: AppVersionDto) => {
    await deleteVersion(version.id);
  }, [deleteVersion]);

  return (
    <div className="flex flex-col h-full px-6 py-5">
      <VersionListHeader
        appName={app?.name || 'Loading...'}
        onBack={navigateBack}
        onCreateVersion={handleOpenCreateModal}
      />

      <VersionListContent
        versions={versions}
        loading={loading}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteVersion}
        onShowQR={handleShowQR}
      />

      <VersionModal
        visible={versionModalVisible}
        version={editingVersion}
        onClose={handleCloseVersionModal}
        onSave={handleSaveVersion}
      />

      <QRModal
        visible={qrModalVisible}
        version={selectedVersion}
        onClose={handleCloseQRModal}
      />
    </div>
  );
});
