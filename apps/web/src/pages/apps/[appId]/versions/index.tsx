import { bindServices } from '@rabjs/react';
import { Layout } from '../../../../../components/layout';
import { VersionList } from './components/version-list';

/**
 * Versions Page
 * Displays list of versions for a specific app
 */
function VersionsPage() {
  return (
    <Layout>
      <div className="h-full bg-gray-50 dark:bg-zinc-950">
        <VersionList />
      </div>
    </Layout>
  );
}

const VersionsPageWithServices = bindServices(VersionsPage, []);

export default VersionsPageWithServices;
