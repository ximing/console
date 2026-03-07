import { Command } from 'commander';

/**
 * Interface for CLI subcommands
 */
export interface CliCommand {
  name: string;
  description: string;
  register(program: Command): Command;
}

/**
 * Registry for CLI subcommands
 */
class CommandRegistry {
  private commands: CliCommand[] = [];

  register(command: CliCommand): void {
    this.commands.push(command);
  }

  getCommands(): CliCommand[] {
    return this.commands;
  }

  registerAll(program: Command): void {
    for (const cmd of this.commands) {
      cmd.register(program);
    }
  }
}

export const commandRegistry = new CommandRegistry();

// Import and register built-in commands
import { initCommand } from './init.command.js';
import { notifyCommand } from './notify.command.js';

commandRegistry.register(initCommand);
commandRegistry.register(notifyCommand);
