import { Service } from 'typedi';
import * as Y from 'yjs';
import { logger } from '../utils/logger.js';

@Service()
export class YjsContentService {
  /**
   * Extract Tiptap-compatible JSON content from Yjs document
   * The Y.Doc contains the full collaborative document state
   */
  extractTiptapContent(yDoc: Y.Doc): Record<string, unknown> {
    try {
      // Get the content map from Y.Doc
      // Tiptap stores content in a specific structure within Y.Doc
      const contentXmlFragment = yDoc.get('content', Y.XmlFragment);

      if (!contentXmlFragment || contentXmlFragment.length === 0) {
        logger.debug('Y.Doc content is empty');
        return { type: 'doc', content: [] };
      }

      // Convert Y.XmlFragment to Tiptap JSON structure
      const content = this.xmlFragmentToTiptap(contentXmlFragment);

      return {
        type: 'doc',
        content,
      };
    } catch (err) {
      logger.error('Failed to extract Tiptap content from Y.Doc', { error: err });
      // Return minimal valid Tiptap doc on error
      return { type: 'doc', content: [] };
    }
  }

  /**
   * Convert Y.XmlFragment to Tiptap-compatible JSON
   */
  private xmlFragmentToTiptap(xmlFragment: Y.XmlFragment): any[] {
    const content: any[] = [];

    xmlFragment.forEach((child) => {
      if (child instanceof Y.XmlElement) {
        content.push(this.xmlElementToTiptap(child));
      } else if (child instanceof Y.XmlText) {
        const text = this.xmlTextToTiptap(child);
        if (text) {
          content.push(text);
        }
      }
    });

    return content;
  }

  /**
   * Convert Y.XmlElement to Tiptap node
   */
  private xmlElementToTiptap(element: Y.XmlElement): any {
    const node: any = {
      type: element.nodeName,
    };

    // Convert attributes/marks using getAttributes()
    const attrs = element.getAttributes();
    if (attrs && Object.keys(attrs).length > 0) {
      node.attrs = attrs;
    }

    // Convert children
    const content: any[] = [];
    element.forEach((child: any) => {
      if (child instanceof Y.XmlElement) {
        content.push(this.xmlElementToTiptap(child));
      } else if (child instanceof Y.XmlText) {
        const text = this.xmlTextToTiptap(child);
        if (text) {
          content.push(text);
        }
      }
    });

    if (content.length > 0) {
      node.content = content;
    }

    return node;
  }

  /**
   * Convert Y.XmlText to Tiptap text node
   */
  private xmlTextToTiptap(text: Y.XmlText): any | null {
    const content = text.toString();

    if (!content || content.length === 0) {
      return null;
    }

    // Check for marks (formatting)
    const delta = text.toDelta();

    if (delta.length === 1 && !delta[0].attributes) {
      // Simple text without marks
      return {
        type: 'text',
        text: delta[0].insert,
      };
    }

    // Text with marks
    return delta.map((op: any) => ({
      type: 'text',
      text: op.insert,
      ...(op.attributes && { marks: this.attributesToMarks(op.attributes) }),
    }));
  }

  /**
   * Convert Yjs attributes to Tiptap marks
   */
  private attributesToMarks(attrs: Record<string, any>): any[] {
    const marks: any[] = [];

    if (attrs.bold) {
      marks.push({ type: 'bold' });
    }
    if (attrs.italic) {
      marks.push({ type: 'italic' });
    }
    if (attrs.underline) {
      marks.push({ type: 'underline' });
    }
    if (attrs.strike) {
      marks.push({ type: 'strike' });
    }
    if (attrs.code) {
      marks.push({ type: 'code' });
    }
    if (attrs.link) {
      marks.push({ type: 'link', attrs: { href: attrs.link } });
    }

    // Handle text color and background
    if (attrs.color) {
      marks.push({ type: 'textStyle', attrs: { color: attrs.color } });
    }

    return marks;
  }
}
