import { bindServices } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { AppList } from './components/app-list';

/**
 * Apps Page
 * Displays list of apps with version management
 */
function AppsPage() {
  return (
    <Layout>
      <div className="h-full bg-gray-50 dark:bg-zinc-950">
        <AppList />
      </div>
    </Layout>
  );
}

const AppsPageWithServices = bindServices(AppsPage, []);

export default AppsPageWithServices;
