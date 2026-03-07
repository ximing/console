import { Command } from 'commander';

import type { CliCommand } from './index.js';

export const notifyCommand: CliCommand = {
  name: 'notify',
  description: 'Create notifications via command line',
  register(program: Command): Command {
    return program
      .command('notify')
      .description('Create a notification')
      .requiredOption('-c, --channel <channel>', 'Notification channel')
      .requiredOption('-o, --ownership <ownership>', 'Ownership type (user|system)')
      .option('--ownership-id <id>', 'Ownership ID')
      .requiredOption('-m, --content <content>', 'Notification content')
      .option('-t, --message-type <type>', 'Message type', 'info')
      .option('--dry-run', 'Preview notification without sending', false)
      .action((options) => {
        console.log('Notify command executed', options);
      });
  },
};
