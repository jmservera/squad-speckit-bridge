#!/usr/bin/env node

/**
 * T019 + T026 + T031 + T038: CLI Entry Point
 *
 * Commander-based CLI with install, status, context, and review subcommands.
 * Outermost Clean Architecture layer — delegates to composition root.
 */

import { Command } from 'commander';
import { createInstaller, createStatusChecker, createContextBuilder, createReviewer, createIssueCreator, createSyncer } from '../main.js';
import { ErrorCodes, createStructuredError } from '../types.js';
import type { ErrorCode } from '../types.js';
import { createLogger } from './logger.js';
import { createDemoRunner, createDemoDirectory } from '../demo/factory.js';
import { formatHumanOutput, formatJsonOutput, type ExtendedExecutionReport } from '../demo/formatters.js';
import type { DemoConfiguration } from '../demo/entities.js';

const program = new Command();

program
  .name('squad-speckit-bridge')
  .description(
    'Hybrid integration package connecting Squad team memory with Spec Kit planning pipeline',
  )
  .version('0.2.0')
  .option('--config <path>', 'Path to bridge configuration file')
  .option('--json', 'Output in JSON format', false)
  .option('--quiet', 'Suppress informational output', false)
  .option('--verbose', 'Enable verbose output', false);

/** Classify an error message into a structured error code. */
function classifyError(message: string, context: string): ErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes('permission') || lower.includes('eacces') || lower.includes('eperm')) {
    return ErrorCodes.PERMISSION_DENIED;
  }
  if (lower.includes('invalid') || lower.includes('validation')) {
    return ErrorCodes.CONFIG_INVALID;
  }
  if (lower.includes('parse') || lower.includes('syntax') || lower.includes('malformed')) {
    return ErrorCodes.PARSE_ERROR;
  }
  if (context === 'review' && (lower.includes('not found') || lower.includes('enoent'))) {
    return ErrorCodes.TASKS_NOT_FOUND;
  }
  if (context === 'context' && (lower.includes('spec') && lower.includes('not found'))) {
    return ErrorCodes.SPEC_DIR_NOT_FOUND;
  }
  if (lower.includes('squad') && (lower.includes('not found') || lower.includes('enoent'))) {
    return ErrorCodes.SQUAD_NOT_FOUND;
  }
  if (lower.includes('spec') && (lower.includes('not found') || lower.includes('enoent'))) {
    return ErrorCodes.SPECKIT_NOT_FOUND;
  }
  // Fallback per context
  const contextDefaults: Record<string, ErrorCode> = {
    install: ErrorCodes.PERMISSION_DENIED,
    status: ErrorCodes.SQUAD_NOT_FOUND,
    context: ErrorCodes.SQUAD_NOT_FOUND,
    review: ErrorCodes.TASKS_NOT_FOUND,
    issues: ErrorCodes.TASKS_NOT_FOUND,
    sync: ErrorCodes.SYNC_FAILED,
    demo: ErrorCodes.PARSE_ERROR,
  };
  return contextDefaults[context] ?? ErrorCodes.PARSE_ERROR;
}

function emitError(message: string, context: string, jsonOutput: boolean): void {
  const code = classifyError(message, context);
  if (jsonOutput) {
    console.error(JSON.stringify(createStructuredError(code, message), null, 2));
  } else {
    const structured = createStructuredError(code, message);
    console.error(`Error [${structured.code}]: ${structured.message}`);
    console.error(`  Suggestion: ${structured.suggestion}`);
  }
}

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
      emitError(message, 'install', jsonOutput);
      process.exitCode = 1;
    }
  });

// Context subcommand (T026)
program
  .command('context')
  .description(
    'Generate a context summary from Squad memory for Spec Kit planning',
  )
  .argument('<spec-dir>', 'Target spec directory (e.g., specs/001-feature/)')
  .option('--max-size <bytes>', 'Maximum output size in bytes', '8192')
  .option(
    '--sources <list>',
    'Comma-separated list of sources to include',
    'skills,decisions,histories',
  )
  .option('--squad-dir <path>', 'Override Squad directory path')
  .action(async (specDir: string, cmdOpts) => {
    const globalOpts = program.opts();
    const jsonOutput = globalOpts.json as boolean;
    const quiet = globalOpts.quiet as boolean;

    try {
      const sourcesList = (cmdOpts.sources as string).split(',').map((s: string) => s.trim());
      const builder = createContextBuilder({
        configPath: globalOpts.config as string | undefined,
        squadDir: cmdOpts.squadDir as string | undefined,
        specDir,
        maxSize: parseInt(cmdOpts.maxSize as string, 10),
        sources: {
          skills: sourcesList.includes('skills'),
          decisions: sourcesList.includes('decisions'),
          histories: sourcesList.includes('histories'),
        },
      });

      const result = await builder.build();

      if (jsonOutput) {
        console.log(JSON.stringify(result.jsonOutput, null, 2));
      } else if (!quiet) {
        console.log(result.humanOutput);
      }

      process.exitCode = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitError(message, 'context', jsonOutput);
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
      emitError(message, 'status', jsonOutput);
      process.exitCode = 1;
    }
  });

// Review subcommand
program
  .command('review')
  .description(
    'Generate a Design Review for a Spec Kit tasks.md file',
  )
  .argument('<tasks-file>', 'Path to Spec Kit tasks.md to review')
  .option('--output <path>', 'Where to write the review template')
  .option('--squad-dir <path>', 'Override Squad directory path')
  .option('--notify', 'Output a brief notification instead of full review', false)
  .action(async (tasksFile: string, cmdOpts: Record<string, unknown>) => {
    const globalOpts = program.opts();
    const jsonOutput = globalOpts.json as boolean;
    const quiet = globalOpts.quiet as boolean;
    const notify = cmdOpts.notify as boolean;

    // T038: --notify mode — lightweight notification without full review
    if (notify) {
      const message = `📋 Design Review available for: ${tasksFile}\n   Run \`npx @jmservera/squad-speckit-bridge review ${tasksFile}\` to generate the full review.`;
      if (jsonOutput) {
        console.log(JSON.stringify({
          notification: true,
          tasksFile,
          message: `Design Review available for: ${tasksFile}`,
        }, null, 2));
      } else if (!quiet) {
        console.log(message);
      }
      process.exitCode = 0;
      return;
    }

    try {
      const reviewer = createReviewer({
        configPath: globalOpts.config as string | undefined,
        squadDir: cmdOpts.squadDir as string | undefined,
      });

      const result = await reviewer.review(
        tasksFile,
        cmdOpts.output as string | undefined,
      );

      if (jsonOutput) {
        console.log(JSON.stringify(result.jsonOutput, null, 2));
      } else if (!quiet) {
        console.log(result.humanOutput);
      }

      process.exitCode = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitError(message, 'review', jsonOutput);
      process.exitCode = 1;
    }
  });

// Issues subcommand
program
  .command('issues')
  .description(
    'Create GitHub issues from unchecked tasks in a tasks.md file',
  )
  .argument('<tasks-file>', 'Path to Spec Kit tasks.md')
  .option('--dry-run', 'Preview issues without creating them', false)
  .option('--labels <labels>', 'Comma-separated labels to apply', 'squad,speckit')
  .option('--repo <owner/repo>', 'GitHub repository (owner/repo format)')
  .action(async (tasksFile: string, cmdOpts: Record<string, unknown>) => {
    const globalOpts = program.opts();
    const jsonOutput = globalOpts.json as boolean;
    const quiet = globalOpts.quiet as boolean;
    const verbose = globalOpts.verbose as boolean;
    const logger = createLogger({ verbose, quiet });

    try {
      logger.verbose(`Creating issues from ${tasksFile}`);

      const creator = createIssueCreator({
        configPath: globalOpts.config as string | undefined,
      });

      const labels = (cmdOpts.labels as string).split(',').map((l: string) => l.trim());

      const result = await creator.createFromTasks(tasksFile, {
        dryRun: cmdOpts.dryRun as boolean,
        labels,
        repository: cmdOpts.repo as string | undefined,
      });

      logger.verbose(`Created ${result.jsonOutput.created.length} issues`);

      if (jsonOutput) {
        console.log(JSON.stringify(result.jsonOutput, null, 2));
      } else if (!quiet) {
        console.log(result.humanOutput);
      }

      process.exitCode = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitError(message, 'issues', jsonOutput);
      process.exitCode = 1;
    }
  });

// Sync subcommand
program
  .command('sync')
  .description(
    'Sync implementation learnings back to Squad memory',
  )
  .argument('<spec-dir>', 'Spec directory with execution results')
  .option('--dry-run', 'Preview sync without writing', false)
  .action(async (specDir: string, cmdOpts: Record<string, unknown>) => {
    const globalOpts = program.opts();
    const jsonOutput = globalOpts.json as boolean;
    const quiet = globalOpts.quiet as boolean;
    const verbose = globalOpts.verbose as boolean;
    const logger = createLogger({ verbose, quiet });

    try {
      logger.verbose(`Syncing learnings from ${specDir}`);

      const syncer = createSyncer({
        configPath: globalOpts.config as string | undefined,
      });

      const result = await syncer.sync(specDir, {
        dryRun: cmdOpts.dryRun as boolean,
      });

      logger.verbose(`Sync complete: ${result.jsonOutput.record.learningsUpdated} learnings`);

      if (jsonOutput) {
        console.log(JSON.stringify(result.jsonOutput, null, 2));
      } else if (!quiet) {
        console.log(result.humanOutput);
      }

      process.exitCode = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitError(message, 'sync', jsonOutput);
      process.exitCode = 1;
    }
  });

// Demo subcommand
program
  .command('demo')
  .description('Run E2E demo of the pipeline')
  .option('--dry-run', 'Simulate GitHub issue creation without API calls', false)
  .option('--keep', 'Preserve demo artifacts after completion', false)
  .option('--verbose', 'Enable verbose output', false)
  .option('--json', 'Output in JSON format', false)
  .action(async (cmdOpts: Record<string, unknown>) => {
    const globalOpts = program.opts();
    const jsonOutput = (cmdOpts.json as boolean) || (globalOpts.json as boolean);
    const verbose = (cmdOpts.verbose as boolean) || (globalOpts.verbose as boolean);
    const logger = createLogger({ verbose, quiet: globalOpts.quiet as boolean });

    // T032: Wire graceful shutdown via AbortController + SIGINT
    const controller = new AbortController();
    const onSigint = () => { controller.abort(); };
    process.on('SIGINT', onSigint);

    try {
      const demoDir = createDemoDirectory();
      logger.verbose(`Starting E2E demo in ${demoDir}`);

      const config: DemoConfiguration = {
        exampleFeature: 'User Authentication with OAuth2 and JWT tokens',
        demoDir,
        flags: {
          dryRun: cmdOpts.dryRun as boolean,
          keep: cmdOpts.keep as boolean,
          verbose,
        },
        timeout: 30,
        squadDir: '.squad',
        specifyDir: 'specs',
      };

      const runner = createDemoRunner();
      const report = await runner.run(config, { signal: controller.signal });

      if (jsonOutput) {
        // Build extended report for JSON output
        const extendedReport: ExtendedExecutionReport = {
          ...report,
          stages: [], // Stages are internal to orchestrator
          demoDir: config.demoDir,
          flags: config.flags,
        };
        console.log(formatJsonOutput(extendedReport));
      } else {
        console.log(formatHumanOutput(report));
      }

      process.exitCode = report.stagesFailed > 0 ? 1 : 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitError(message, 'demo', jsonOutput);
      process.exitCode = 1;
    } finally {
      process.removeListener('SIGINT', onSigint);
    }
  });

program.parse();
