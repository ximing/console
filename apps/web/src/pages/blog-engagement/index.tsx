import { bindServices } from '@rabjs/react';
import { BlogEngagementPage } from './blog-engagement';

/**
 * Blog engagement page entry
 * BlogEngagementService is registered globally
 */
const BlogEngagementPageWithServices = bindServices(BlogEngagementPage, []);
export default BlogEngagementPageWithServices;
