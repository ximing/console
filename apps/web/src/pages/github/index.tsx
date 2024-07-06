import { bindServices } from '@rabjs/react';
import { GithubPage } from './github';

/**
 * GitHub page entry
 * GithubService is registered globally
 */
const GithubPageWithServices = bindServices(GithubPage, []);
export default GithubPageWithServices;
