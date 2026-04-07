import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AppService } from '../../../../../services/app.service';
import type { AppDto, CreateAppDto, UpdateAppDto } from '@x-console/dto';
import { toast } from '../../../../../components/toast/toast.service';

/**
 * Hook for managing app list operations
 */
export const useAppList = view(() => {
  const appService = useService(AppService);
  const navigate = useNavigate();

  const loadApps = useCallback(async () => {
    await appService.loadApps();
  }, [appService]);

  const createApp = useCallback(async (data: CreateAppDto): Promise<AppDto | null> => {
    const app = await appService.createApp(data);
    if (app) {
      toast.success('App created successfully');
    }
    return app;
  }, [appService]);

  const updateApp = useCallback(async (id: string, data: UpdateAppDto): Promise<AppDto | null> => {
    const app = await appService.updateApp(id, data);
    if (app) {
      toast.success('App updated successfully');
    }
    return app;
  }, [appService]);

  const deleteApp = useCallback(async (id: string): Promise<boolean> => {
    const confirmed = window.confirm('Are you sure you want to delete this app? All versions will also be deleted.');
    if (!confirmed) return false;

    const success = await appService.deleteApp(id);
    if (success) {
      toast.success('App deleted successfully');
    }
    return success;
  }, [appService]);

  const navigateToVersions = useCallback((appId: string) => {
    navigate(`/apps/${appId}/versions`);
  }, [navigate]);

  return {
    apps: appService.apps,
    loading: appService.loading,
    loadApps,
    createApp,
    updateApp,
    deleteApp,
    navigateToVersions,
  };
});
