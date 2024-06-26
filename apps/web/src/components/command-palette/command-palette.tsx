import { useState, useEffect, useRef, useCallback } from 'react';
import { isElectron } from '../../electron/isElectron';
import { executeTool, recognizeIntent, executeIntent, type Tool, type ToolExecutionResponse, type IntentResult } from '../../api/tool';
import { MarkdownRenderer } from '../../utils/markdown';
import { renderMarkdownToHtml } from '../../utils/markdown-html';
import { authService } from '../../services/auth.service';

const STORAGE_KEY = 'command-palette-model-id';

/**
 * CommandPalette component - a modal command palette similar to uTools
 * Triggered by global hotkey (Option+Space on macOS, Alt+Space on Windows/Linux)
 */
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  // Keep ref in sync with state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  const [inputValue, setInputValue] = useState('');
  const [matchedTools, setMatchedTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolInput, setToolInput] = useState('');
  const [toolResult, setToolResult] = useState<ToolExecutionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Intent recognition state
  const [recognizedIntent, setRecognizedIntent] = useState<IntentResult | null>(null);
  const [showIntentConfirm, setShowIntentConfirm] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [modelId, setModelId] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const toolInputRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load model preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setModelId(saved);
    }

    // Check login status
    setIsLoggedIn(authService.isAuthenticated);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current && !selectedTool) {
      inputRef.current.focus();
    }
    if (isOpen && toolInputRef.current && selectedTool) {
      toolInputRef.current.focus();
    }
  }, [isOpen, selectedTool]);

  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      if (showIntentConfirm) {
        // Go back from intent confirmation
        setShowIntentConfirm(false);
        setRecognizedIntent(null);
      } else if (selectedTool) {
        // Go back to tool selection
        setSelectedTool(null);
        setToolInput('');
        setToolResult(null);
      } else {
        setIsOpen(false);
        setInputValue('');
        setMatchedTools([]);
        setRecognizedIntent(null);
        setShowIntentConfirm(false);
      }
    }
  }, [isOpen, selectedTool, showIntentConfirm]);

  // Listen for global keyboard events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Debounced AI intent recognition
  useEffect(() => {
    if (!inputValue.trim()) {
      setMatchedTools([]);
      setRecognizedIntent(null);
      setShowIntentConfirm(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsRecognizing(true);
      try {
        const result = await recognizeIntent(inputValue, modelId || undefined);

        if (result.intent) {
          setRecognizedIntent(result.intent);

          if (result.intent.isHighConfidence) {
            // High confidence - auto execute
            setShowIntentConfirm(false);
            setMatchedTools([]);

            // Auto execute the intent
            if (result.intent.intentId.includes('ai-') && !isLoggedIn) {
              // AI tool requires login - show login prompt
              setShowLoginPrompt(true);
            } else {
              // Execute automatically
              setIsLoading(true);
              try {
                const execResult = await executeIntent(
                  result.intent.intentId,
                  result.intent.rawInput,
                  result.intent.extractedParams,
                  modelId || undefined
                );

                if (!execResult.success && (execResult.error?.includes('需要登录') || execResult.error?.includes('登录'))) {
                  setShowLoginPrompt(true);
                }

                setToolResult(execResult);
              } catch (execError) {
                setToolResult({
                  success: false,
                  error: execError instanceof Error ? execError.message : 'Auto execution failed',
                });
              } finally {
                setIsLoading(false);
              }
            }
          } else {
            // Low confidence - show confirmation
            setShowIntentConfirm(true);
            setMatchedTools([]);
          }
        } else {
          // No intent recognized, fallback to tool list
          setRecognizedIntent(null);
          setShowIntentConfirm(false);
          setMatchedTools([]);
        }
      } catch (error) {
        console.error('Failed to recognize intent:', error);
        setRecognizedIntent(null);
        setShowIntentConfirm(false);
        setMatchedTools([]);
      } finally {
        setIsRecognizing(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue]);

  // Listen for command palette toggle from Electron main process
  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const toggleHandler = () => {
      console.log('[CommandPalette] Toggle event received, isOpenRef.current:', isOpenRef.current);
      setIsOpen((prev) => {
        const newValue = !prev;
        console.log('[CommandPalette] isOpen changing from', prev, 'to', newValue);
        if (!prev) {
          // Opening the palette - reset state
          setInputValue('');
          setMatchedTools([]);
          setSelectedTool(null);
          setToolInput('');
          setToolResult(null);
          setRecognizedIntent(null);
          setShowIntentConfirm(false);
          setIsLoggedIn(authService.isAuthenticated);
        }
        return newValue;
      });
    };

    console.log('[CommandPalette] Setting up toggle listener, electronAPI:', !!window.electronAPI);
    console.log('[CommandPalette] onCommandPaletteToggle:', !!window.electronAPI?.onCommandPaletteToggle);
    console.log('[CommandPalette] Registering toggleHandler');
    window.electronAPI?.onCommandPaletteToggle?.(toggleHandler);

    return () => {
      console.log('[CommandPalette] Removing toggleHandler');
      window.electronAPI?.removeCommandPaletteToggleListener?.(toggleHandler);
    };
  }, []);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
      setInputValue('');
      setMatchedTools([]);
      setSelectedTool(null);
      setToolInput('');
      setToolResult(null);
      setRecognizedIntent(null);
      setShowIntentConfirm(false);
    }
  };

  // Handle tool selection
  const handleToolSelect = (tool: Tool) => {
    // Check if AI tool requires login
    if (tool.category === 'ai' && !isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setSelectedTool(tool);
    setToolInput('');
    setToolResult(null);
    setIsLoading(false);
    setCopySuccess(false);
  };

  // Handle intent confirmation execution
  const handleIntentConfirm = async () => {
    if (!recognizedIntent) return;

    // Check if AI tool requires login
    if (recognizedIntent.intentId.includes('ai-') && !isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setIsLoading(true);
    setToolResult(null);

    try {
      const result = await executeIntent(
        recognizedIntent.intentId,
        recognizedIntent.rawInput,
        recognizedIntent.extractedParams,
        modelId || undefined
      );

      // Check if AI tool requires login
      if (!result.success && result.error?.includes('需要登录') || result.error?.includes('登录')) {
        setShowLoginPrompt(true);
      }

      setToolResult(result);
      setShowIntentConfirm(false);
    } catch (error) {
      setToolResult({
        success: false,
        error: error instanceof Error ? error.message : 'Intent execution failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modifying intent parameters
  const handleIntentModify = () => {
    if (!recognizedIntent) return;

    // Convert intent to tool for the existing tool input UI
    const tool: Tool = {
      id: recognizedIntent.intentId,
      name: recognizedIntent.intentName,
      nameEn: recognizedIntent.intentName,
      description: '',
      confidence: recognizedIntent.confidence,
    };

    setSelectedTool(tool);
    setToolInput(recognizedIntent.rawInput);
    setShowIntentConfirm(false);
    setToolResult(null);
  };

  // Handle tool execution
  const handleExecuteTool = async () => {
    if (!selectedTool) return;

    // For uuid-generate, allow execution without input (default to 1 UUID)
    const isUuidGenerate = selectedTool.id === 'uuid-generate';
    if (!isUuidGenerate && !toolInput.trim()) return;

    setIsLoading(true);
    setToolResult(null);

    try {
      const executeData: { toolId: string; input: string; options?: Record<string, unknown>; modelId?: string } = {
        toolId: selectedTool.id,
        input: toolInput,
        modelId: modelId || undefined,
      };

      // For uuid-generate, parse input as count or use default
      if (isUuidGenerate) {
        const count = toolInput.trim() ? parseInt(toolInput.trim(), 10) : 1;
        executeData.options = { count: isNaN(count) ? 1 : Math.min(Math.max(count, 1), 100) };
        executeData.input = ''; // UUID doesn't need input
      }

      const result = await executeTool(executeData);

      // Check if AI tool requires login
      if (!result.success && result.error?.includes('需要登录')) {
        setShowLoginPrompt(true);
      }

      setToolResult(result);
    } catch (error) {
      setToolResult({
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key in tool input
  const handleToolInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecuteTool();
    }
  };

  // Copy result to clipboard
  const handleCopyResult = async () => {
    if (!toolResult?.result) return;

    try {
      // For markdown-preview, copy HTML; otherwise copy plain text
      const contentToCopy = selectedTool?.id === 'markdown-preview'
        ? renderMarkdownToHtml(toolResult.result)
        : toolResult.result;
      await navigator.clipboard.writeText(contentToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle login from command palette
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const result = await authService.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (result.success) {
        setIsLoggedIn(true);
        setShowLoginPrompt(false);
        setLoginEmail('');
        setLoginPassword('');
        // Retry tool execution if we were trying to use an AI tool
        if (selectedTool) {
          handleExecuteTool();
        }
      } else {
        setLoginError(result.message || '登录失败');
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await authService.logout();
    setIsLoggedIn(false);
  };

  // Don't render in browser environment
  if (!isElectron()) {
    return null;
  }

  console.log('[CommandPalette] Rendering, isOpen:', isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-[600px] max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* Search icon */}
          <svg
            className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {isRecognizing && (
            <svg className="animate-spin h-5 w-5 text-blue-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入命令或搜索..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-lg"
            disabled={!!selectedTool}
          />
          {/* Keyboard shortcut hint */}
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="max-h-[50vh] overflow-y-auto">
          {showIntentConfirm && recognizedIntent ? (
            // Intent confirmation view (when confidence < 0.8)
            <div className="p-4">
              {/* Intent header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setShowIntentConfirm(false);
                      setRecognizedIntent(null);
                    }}
                    className="mr-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="font-medium text-gray-900 dark:text-gray-100">确认意图</span>
                </div>
              </div>

              {/* Intent info card */}
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{recognizedIntent.intentName}</span>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">置信度</span>
                    <span className={`text-sm font-medium ${
                      recognizedIntent.confidence >= 0.7
                        ? 'text-green-600 dark:text-green-400'
                        : recognizedIntent.confidence >= 0.6
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {Math.round(recognizedIntent.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all ${
                      recognizedIntent.confidence >= 0.7
                        ? 'bg-green-500'
                        : recognizedIntent.confidence >= 0.6
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${recognizedIntent.confidence * 100}%` }}
                  />
                </div>

                {/* Extracted params */}
                {Object.keys(recognizedIntent.extractedParams).length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">提取的参数: </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {JSON.stringify(recognizedIntent.extractedParams)}
                    </span>
                  </div>
                )}

                {/* Raw input */}
                <div className="mt-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">原始输入: </span>
                  <span className="text-gray-900 dark:text-gray-100">{recognizedIntent.rawInput}</span>
                </div>
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">正在执行...</span>
                  </div>
                </div>
              )}

              {/* Tool result */}
              {toolResult && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">结果</span>
                    <button
                      onClick={handleCopyResult}
                      disabled={!toolResult.success}
                      className="flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copySuccess ? (
                        <>
                          <svg className="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          复制
                        </>
                      )}
                    </button>
                  </div>
                  {toolResult.success ? (
                    <pre className="p-3 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {toolResult.result}
                    </pre>
                  ) : (
                    <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      {toolResult.error}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {!toolResult && (
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleIntentModify}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    修改参数
                  </button>
                  <button
                    onClick={handleIntentConfirm}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '执行中...' : '确认执行'}
                  </button>
                </div>
              )}
            </div>
          ) : selectedTool ? (
            // Tool execution view
            <div className="p-4">
              {/* Tool header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setSelectedTool(null);
                      setToolInput('');
                      setToolResult(null);
                    }}
                    className="mr-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{selectedTool.name}</span>
                </div>
              </div>

              {/* Tool input */}
              <textarea
                ref={toolInputRef}
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyDown={handleToolInputKeyDown}
                placeholder={selectedTool.id === 'uuid-generate'
                  ? '输入生成数量（默认1，最大100）...'
                  : `输入要处理的${selectedTool.name}内容...`}
                className="w-full h-32 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none outline-none focus:border-blue-500 dark:text-gray-100 dark:placeholder-gray-500"
                disabled={isLoading}
              />

              {/* Execute button */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleExecuteTool}
                  disabled={(selectedTool.id !== 'uuid-generate' && !toolInput.trim()) || isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '处理中...' : '执行'}
                </button>
              </div>

              {/* Tool result */}
              {toolResult && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">结果</span>
                    <button
                      onClick={handleCopyResult}
                      disabled={!toolResult.success}
                      className="flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copySuccess ? (
                        <>
                          <svg className="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          复制
                        </>
                      )}
                    </button>
                  </div>
                  {toolResult.success ? (
                    selectedTool?.id === 'markdown-preview' ? (
                      <div className="p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
                        <MarkdownRenderer content={toolResult.result || ''} />
                      </div>
                    ) : (
                      <pre className="p-3 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {toolResult.result}
                      </pre>
                    )
                  ) : (
                    <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      {toolResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : inputValue ? (
            // Tool list
            matchedTools.length > 0 ? (
              <div className="py-2">
                {matchedTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{tool.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{tool.description}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round(tool.confidence * 100)}%
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                未找到匹配的工具
              </div>
            )
          ) : (
            // Empty state
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              开始输入以搜索工具...
            </div>
          )}
        </div>

        {/* Login status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {isLoggedIn ? (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              已登录
            </div>
          ) : (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              未登录（AI 工具需要登录）
            </div>
          )}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              退出登录
            </button>
          ) : (
            <button
              onClick={() => setShowLoginPrompt(true)}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              登录
            </button>
          )}
        </div>
      </div>

      {/* Login prompt modal */}
      {showLoginPrompt && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="w-full max-w-[400px] mx-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              登录以使用 AI 工具
            </div>
            <form onSubmit={handleLogin}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 dark:text-gray-100 dark:placeholder-gray-500"
                    disabled={isLoggingIn}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    密码
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 dark:text-gray-100 dark:placeholder-gray-500"
                    disabled={isLoggingIn}
                  />
                </div>
                {loginError && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {loginError}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginPrompt(false);
                    setLoginError('');
                  }}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  disabled={isLoggingIn}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!loginEmail.trim() || !loginPassword.trim() || isLoggingIn}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? '登录中...' : '登录'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandPalette;
