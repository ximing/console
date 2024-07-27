import { view } from '@rabjs/react';
import { Layout } from '../../../components/layout';
import { BlogEditor } from './editor';

/**
 * Blog Editor Page
 * Wraps the blog editor with the main layout
 */
export const BlogEditorPage = view(() => {
  return (
    <Layout>
      <BlogEditor />
    </Layout>
  );
});

export default BlogEditorPage;
