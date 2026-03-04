import type { ActionHandler, ActionResult, ActionParamSchema } from './types.js';

/**
 * HTTP Request action configuration
 */
export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * HTTP Request action - makes HTTP requests to specified URLs
 */
export class HttpRequestAction implements ActionHandler {
  id = 'http-request';
  name = 'HTTP Request';
  description = 'Make HTTP requests to specified URLs';

  paramSchema: Record<string, ActionParamSchema> = {
    url: {
      type: 'string',
      description: 'The URL to send the request to',
      required: true,
    },
    method: {
      type: 'string',
      description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
      required: true,
      default: 'GET',
    },
    headers: {
      type: 'object',
      description: 'HTTP headers as key-value pairs',
      required: false,
    },
    body: {
      type: 'object',
      description: 'Request body (for POST, PUT, PATCH)',
      required: false,
    },
    timeout: {
      type: 'number',
      description: 'Request timeout in milliseconds',
      required: false,
      default: 30000,
    },
  };

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const config = params as unknown as HttpRequestConfig;
    const { url, method, headers = {}, body, timeout = 30000 } = config;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      let responseData: unknown;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `HTTP ${response.status}: ${response.statusText}`,
            code: `HTTP_${response.status}`,
          },
        };
      }

      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          body: responseData,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            message: `Request timeout after ${timeout}ms`,
            code: 'TIMEOUT',
          },
        };
      }

      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'REQUEST_FAILED',
        },
      };
    }
  }
}
