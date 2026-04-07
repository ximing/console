import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { appVersionService } from '../../../../../../../services/app-version.service';
import { appService } from '../../../../../../../services/app.service';
import type { AppVersionDto, CreateVersionDto, UpdateVersionDto } from '@x-console/dto';
import { toast } from '../../../../../../../services/toast.service';

/**
 * Hook for managing version list operations
 */
export function useVersionList() {
  const navigate = useNavigate();
  const params = useParams();
  const appId = params.appId!;

  const loadVersions = useCallback(async () => {
    await appVersionService.loadVersions(appId);
  }, [appId]);

  const loadApp = useCallback(async () => {
    // Try to find app in current list first
    let app = appService.apps.find(a => a.id === appId);
    if (!app) {
      // Load apps if not found
      await appService.loadApps();
      app = appService.apps.find(a => a.id === appId);
    }
    return app;
  }, [appId]);

  const createVersion = useCallback(async (data: CreateVersionDto): Promise<AppVersionDto | null> => {
    const version = await appVersionService.createVersion(appId, data);
    if (version) {
      toast.success('Version created successfully');
    }
    return version;
  }, [appId]);

  const updateVersion = useCallback(async (versionId: string, data: UpdateVersionDto): Promise<AppVersionDto | null> => {
    const version = await appVersionService.updateVersion(appId, versionId, data);
    if (version) {
      toast.success('Version updated successfully');
    }
    return version;
  }, [appId]);

  const deleteVersion = useCallback(async (versionId: string): Promise<boolean> => {
    const confirmed = window.confirm('Are you sure you want to delete this version?');
    if (!confirmed) return false;

    const success = await appVersionService.deleteVersion(appId, versionId);
    if (success) {
      toast.success('Version deleted successfully');
    }
    return success;
  }, [appId]);

  const navigateBack = useCallback(() => {
    navigate('/apps');
  }, [navigate]);

  return {
    versions: appVersionService.versions,
    loading: appVersionService.loading,
    loadVersions,
    loadApp,
    createVersion,
    updateVersion,
    deleteVersion,
    navigateBack,
  };
}
