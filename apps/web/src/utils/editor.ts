import { Editor } from '@tiptap/react';
import type { EditorState } from '@tiptap/pm/state';
import { uploadMedia, validateMediaFile } from '../api/blog-media';
import type { MediaUploadResponse } from '../api/blog-media';

export const TEMP_PATH_PREFIX = 'temp:';

/**
 * Generate a unique temporary ID for placeholder nodes
 */
export function generateTempId(): string {
  return `${TEMP_PATH_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Check if a path is a temporary placeholder path
 */
export function isTempPath(path: string | null | undefined): boolean {
  return !path || path.startsWith(TEMP_PATH_PREFIX);
}

/**
 * Find a customImage node by its path in the editor state
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findCustomImageNode<S extends EditorState>(
  state: S,
  path: string
): { pos: number; node: any } | null {
  let result: { pos: number; node: any } | null = null;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'customImage' && node.attrs.path === path) {
      result = { pos, node };
    }
  });
  return result;
}

/**
 * Update a placeholder image node with real path after upload
 */
export function updatePlaceholderNode(
  editor: Editor,
  tempId: string,
  result: MediaUploadResponse
): void {
  editor.chain().focus().command(({ tr, state }) => {
    const found = findCustomImageNode(state, tempId);
    if (found) {
      tr.setNodeMarkup(found.pos, undefined, {
        path: result.path,
        alt: result.filename,
        width: result.width,
        height: result.height,
        uploadStatus: 'uploaded',
      });
    }
    return !!found;
  }).run();
}

/**
 * Remove a placeholder node when upload fails
 */
export function removePlaceholderNode(editor: Editor, tempId: string): void {
  editor.chain().focus().command(({ tr, state }) => {
    const found = findCustomImageNode(state, tempId);
    if (found) {
      tr.delete(found.pos, found.pos + found.node.nodeSize);
    }
    return !!found;
  }).run();
}

/**
 * Upload an image and insert it as a placeholder, then replace with real path on success
 * Returns the tempId for tracking
 */
export async function uploadImagePlaceholder(
  editor: Editor,
  file: File,
  blogId: string,
  onError?: (message: string) => void
): Promise<string | null> {
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    onError?.(validation.error || '图片格式不支持');
    return null;
  }

  const tempId = generateTempId();
  editor.chain().focus().setCustomImage({
    path: tempId,
    alt: file.name,
    uploadStatus: 'uploading',
  }).run();

  try {
    const result = await uploadMedia(file, blogId);
    updatePlaceholderNode(editor, tempId, result);
    return tempId;
  } catch {
    removePlaceholderNode(editor, tempId);
    onError?.('图片上传失败');
    return null;
  }
}
