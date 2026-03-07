import { Command } from 'commander';

import type { CliCommand } from './index.js';

export const initCommand: CliCommand = {
  name: 'init',
  description: 'Generate configuration file for AIMO CLI',
  register(program: Command): Command {
    return program
      .command('init')
      .description('Generate .aimo-cli.json configuration file')
      .option('-f, --force', 'Overwrite existing configuration file', false)
      .action((options) => {
        console.log('Init command executed', options);
      });
  },
};
