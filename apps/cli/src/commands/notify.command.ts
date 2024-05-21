import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { Command } from 'commander';

import type { CliCommand } from './index.js';

const CONFIG_FILE_NAME = '.aimo-cli.json';

interface CliConfig {
  domain: string;
  token: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  code?: number;
  message?: string;
}

interface NotificationResponse {
  id: string;
  channel: string;
  ownership: string;
  ownershipId: string;
  content: string;
  messageType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Load config from file
 */
function loadConfig(configPath?: string): CliConfig | null {
  const resolvedPath = configPath
    ? path.resolve(process.cwd(), configPath)
    : path.resolve(process.cwd(), CONFIG_FILE_NAME);

  if (!existsSync(resolvedPath)) {
    return null;
  }

  try {
    const content = readFileSync(resolvedPath, 'utf8');
    return JSON.parse(content) as CliConfig;
  } catch {
    return null;
  }
}

/**
 * Get configuration with priority: env > CLI options > config file
 */
function getConfig(options: {
  domain?: string;
  token?: string;
  config?: string;
}): { domain: string; token: string } | null {
  // Priority 1: Environment variables
  const envDomain = process.env.AIMO_CLI_DOMAIN;
  const envToken = process.env.AIMO_CLI_TOKEN;

  // Priority 2: CLI options
  const cliDomain = options.domain;
  const cliToken = options.token;

  // Priority 3: Config file (with optional custom path)
  const configFile = loadConfig(options.config);

  const domain = envDomain ?? cliDomain ?? configFile?.domain;
  const token = envToken ?? cliToken ?? configFile?.token;

  if (!domain || !token) {
    return null;
  }

  return { domain, token };
}

export const notifyCommand: CliCommand = {
  name: 'notify',
  description: 'Create notifications via command line',
  register(program: Command): Command {
    return program
      .command('notify')
      .description('Create a notification')
      .requiredOption('-c, --channel <channel>', 'Notification channel (wechat|feishu|dingtalk|slack|email|webhook)')
      .requiredOption('-o, --ownership <ownership>', 'Ownership type (group|private)')
      .option('--ownership-id <id>', 'Ownership ID', '')
      .requiredOption('-m, --content <content>', 'Notification content')
      .option('-t, --message-type <type>', 'Message type (text|image|file|link|mixed)', 'text')
      .option('--dry-run', 'Preview notification without sending', false)
      .option('--domain <domain>', 'Override domain from config')
      .option('--token <token>', 'Override token from config')
      .option('--config <path>', 'Path to config file (default: .aimo-cli.json)')
      .action(async (options) => {
        const config = getConfig(options);

        if (!config) {
          console.error('Error: Missing configuration');
          console.log('Please provide configuration via one of:');
          console.log('  - Environment variables: AIMO_CLI_DOMAIN, AIMO_CLI_TOKEN');
          console.log('  - Config file: .aimo-cli.json (run "aimo-cli init" first)');
          console.log('  - Command options: --domain, --token');
          process.exit(1);
        }

        const notification = {
          channel: options.channel,
          ownership: options.ownership,
          ownershipId: options.ownershipId || options.ownership,
          content: options.content,
          messageType: options.messageType || 'text',
        };

        // Dry run - just print what would be sent
        if (options.dryRun) {
          console.log('=== Dry Run: Notification Preview ===');
          console.log('Endpoint:', `${config.domain}/api/v1/ba/notifications`);
          console.log('Method: POST');
          console.log('Headers:');
          console.log('  Authorization: Bearer ****');
          console.log('Body:', JSON.stringify(notification, null, 2));
          console.log('=====================================');
          return;
        }

        // Send the request
        try {
          const response = await fetch(`${config.domain}/api/v1/ba/notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.token}`,
            },
            body: JSON.stringify(notification),
          });

          const result = (await response.json()) as ApiResponse<NotificationResponse>;

          if (result.success && result.data) {
            console.log('✓ Notification created successfully!');
            console.log('  ID:', result.data.id);
            console.log('  Status:', result.data.status);
            console.log('  Channel:', result.data.channel);
            console.log('  Content:', result.data.content.substring(0, 50) + (result.data.content.length > 50 ? '...' : ''));
          } else {
            console.error('✗ Failed to create notification:', result.message || 'Unknown error');
            process.exit(1);
          }
        } catch (error) {
          console.error('✗ Error:', error instanceof Error ? error.message : 'Network error');
          process.exit(1);
        }
      });
  },
};
