#!/usr/bin/env node

/**
 * T019: CLI Entry Point
 *
 * Commander-based CLI with install and status subcommands.
 * Outermost Clean Architecture layer — delegates to composition root.
 */

import { Command } from 'commander';
import { createInstaller, createStatusChecker } from '../main.js';

const program = new Command();

program
  .name('squad-speckit-bridge')
  .description(
    'Hybrid integration package connecting Squad team memory with Spec Kit planning pipeline',
  )
  .version('0.1.0')
  .option('--config <path>', 'Path to bridge configuration file')
  .option('--json', 'Output in JSON format', false)
  .option('--quiet', 'Suppress informational output', false)
  .option('--verbose', 'Enable verbose output', false);

// Install subcommand
program
  .command('install')
  .description('Deploy bridge components to Squad and Spec Kit directories')
  .option('--squad-dir <path>', 'Override Squad directory path')
  .option('--specify-dir <path>', 'Override Spec Kit directory path')
  .option('--force', 'Overwrite existing bridge files', false)
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    const jsonOutput = globalOpts.json as boolean;
    const quiet = globalOpts.quiet as boolean;

    try {
      const installer = createInstaller({
        configPath: globalOpts.config as string | undefined,
        squadDir: cmdOpts.squadDir as string | undefined,
        specifyDir: cmdOpts.specifyDir as string | undefined,
      });

      const result = await installer.install({ force: cmdOpts.force as boolean });

      if (jsonOutput) {
        console.log(JSON.stringify(result.jsonOutput, null, 2));
      } else if (!quiet) {
        console.log(result.humanOutput);
      }

      process.exitCode = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (jsonOutput) {
        console.error(
          JSON.stringify({
            error: true,
            code: 'INSTALL_FAILED',
            message,
          }),
        );
      } else {
        console.error(`Error: ${message}`);
      }
      process.exitCode = 1;
    }
  });

// Status subcommand
program
  .command('status')
  .description('Show current bridge installation and integration status')
  .action(async () => {
    const globalOpts = program.opts();
    const jsonOutput = globalOpts.json as boolean;
    const quiet = globalOpts.quiet as boolean;

    try {
      const checker = createStatusChecker({
        configPath: globalOpts.config as string | undefined,
      });

      const result = await checker.check();

      if (jsonOutput) {
        console.log(JSON.stringify(result.jsonOutput, null, 2));
      } else if (!quiet) {
        console.log(result.humanOutput);
      }

      process.exitCode = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (jsonOutput) {
        console.error(
          JSON.stringify({
            error: true,
            code: 'STATUS_FAILED',
            message,
          }),
        );
      } else {
        console.error(`Error: ${message}`);
      }
      process.exitCode = 1;
    }
  });

program.parse();
