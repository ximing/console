#!/usr/bin/env node

import { Command } from 'commander';

import { commandRegistry } from './commands/index.js';

const program = new Command();

program
  .name('console-cli')
  .description('AIMO CLI for operations and notifications')
  .version('0.0.1');

// Register subcommands
commandRegistry.registerAll(program);

// Handle unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

program.parse();
