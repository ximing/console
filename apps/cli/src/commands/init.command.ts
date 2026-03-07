import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { Command } from 'commander';

import type { CliCommand } from './index.js';

const CONFIG_FILE_NAME = '.aimo-cli.json';

interface CliConfig {
  domain: string;
  token: string;
}

export const initCommand: CliCommand = {
  name: 'init',
  description: 'Generate configuration file for AIMO CLI',
  register(program: Command): Command {
    return program
      .command('init')
      .description('Generate .aimo-cli.json configuration file')
      .option('-f, --force', 'Overwrite existing configuration file', false)
      .option('--domain <domain>', 'AIMO domain (e.g., https://console.aimo.plus)')
      .option('--token <token>', 'JWT token for authentication')
      .action(async (options) => {
        const configPath = path.resolve(process.cwd(), CONFIG_FILE_NAME);

        // Check if config file exists
        if (existsSync(configPath) && !options.force) {
          console.error(`Configuration file already exists at ${configPath}`);
          console.log('Use --force to overwrite existing configuration');
          process.exit(1);
        }

        // Get domain from options or prompt user
        let domain = options.domain;
        if (!domain) {
          console.log('Please provide your AIMO domain:');
          console.log('Example: https://console.aimo.plus');
          domain = 'https://console.aimo.plus';
        }

        // Get token from options or prompt user
        let token = options.token;
        if (!token) {
          console.log('Please provide your JWT token:');
          console.log('You can generate a token from Settings > API Tokens');
          token = '';
        }

        // Create config object
        const config: CliConfig = {
          domain,
          token,
        };

        // Write config file
        try {
          writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          console.log(`Configuration file created at ${configPath}`);
          console.log('You can now use aimo-cli notify command');
        } catch (error) {
          console.error('Failed to create configuration file:', error);
          process.exit(1);
        }
      });
  },
};
