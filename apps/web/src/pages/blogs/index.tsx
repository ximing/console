import { bindServices } from '@rabjs/react';
import { BlogListPage } from './blogs';

/**
 * Blog list page entry
 * Register services used by the blog list page
 */
const BlogListPageWithServices = bindServices(BlogListPage, [
  // Services are already registered globally, but we can add page-specific services here if needed
]);

export default BlogListPageWithServices;
