import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { createLowlight, common } from 'lowlight';
import { useState, useCallback, useRef } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'sql',
  'html', 'css', 'json', 'yaml', 'xml', 'markdown', 'bash', 'shell',
  'plaintext'
];

const lowlight = createLowlight(common);

function CodeBlockComponent({ node, updateAttributes }: NodeViewProps) {
  const language = node.attrs.language || 'plaintext';
  const [copied, setCopied] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    const codeElement = contentRef.current?.querySelector('code');
    const text = codeElement?.textContent || '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleLanguageChange = useCallback((lang: string) => {
    updateAttributes({ language: lang });
    setShowLangMenu(false);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <div className="relative">
          <button
            type="button"
            className="code-block-btn flex items-center gap-1"
            onClick={() => setShowLangMenu(!showLangMenu)}
          >
            <span className="code-block-language">{language}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showLangMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[120px] max-h-[200px] overflow-y-auto rounded-md shadow-lg">
              <div className="py-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`w-full px-3 py-1.5 text-left text-xs hover:opacity-80 ${
                      lang === language ? 'font-semibold' : ''
                    }`}
                    onClick={() => handleLanguageChange(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="code-block-actions">
          <button
            type="button"
            className="code-block-btn"
            onClick={handleCopy}
            title="复制代码"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="code-block-content" ref={contentRef}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

export const CustomCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'plaintext',
        parseHTML: (element: HTMLElement) => {
          const className = element.className || '';
          const match = className.match(/language-(\w+)/);
          return match ? match[1] : 'plaintext';
        },
        renderHTML: (attributes: { language?: string }) => {
          if (attributes.language && attributes.language !== 'plaintext') {
            return { class: `language-${attributes.language}` };
          }
          return {};
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({ lowlight });
