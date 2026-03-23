/**
 * ProcessExecutor Adapter
 *
 * NodeProcessExecutor implements the ProcessExecutor port interface using
 * Node.js child_process.spawn(). Handles command execution, timeout management,
 * and stdout/stderr capture.
 */

import { spawn } from 'node:child_process';
import type { ProcessExecutor } from '../ports.js';
import type { PipelineStage, DemoConfiguration } from '../entities.js';
import { StageStatus } from '../entities.js';

/** Default timeout in milliseconds (30 seconds per spec) */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Result of executing a command */
interface ExecuteResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Node.js implementation of ProcessExecutor using child_process.spawn().
 *
 * Features:
 * - Timeout handling with configurable duration (default: 30s)
 * - stdout/stderr capture
 * - Exit code tracking
 * - Cross-platform command execution
 */
export class NodeProcessExecutor implements ProcessExecutor {
  /**
   * Execute a pipeline stage command.
   *
   * Updates the stage with execution metadata:
   * - Sets status to Running, then Success or Failed
   * - Records startTime and endTime
   * - Captures error message if failed
   *
   * @param stage - Pipeline stage with command to execute
   * @param config - Demo configuration for timeout
   * @returns Updated stage with execution results
   */
  async execute(
    stage: PipelineStage,
    config: DemoConfiguration
  ): Promise<PipelineStage> {
    const timeoutMs = (config.timeout || 30) * 1000;
    const startTime = Date.now();

    // Mark stage as running
    const runningStage: PipelineStage = {
      ...stage,
      status: StageStatus.Running,
      startTime,
    };

    try {
      const result = await this.executeCommand(
        runningStage.command,
        config.demoDir,
        timeoutMs
      );

      const endTime = Date.now();

      if (result.success) {
        return {
          ...runningStage,
          status: StageStatus.Success,
          endTime,
        };
      }

      // Build detailed error message per spec (FR-014, error handling = detailed)
      const errorDetails = this.buildErrorMessage(
        runningStage.command,
        result
      );

      return {
        ...runningStage,
        status: StageStatus.Failed,
        endTime,
        error: errorDetails,
      };
    } catch (err) {
      const endTime = Date.now();
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        ...runningStage,
        status: StageStatus.Failed,
        endTime,
        error: `Execution error: ${errorMessage}`,
      };
    }
  }

  /**
   * Check if a command is available in the system PATH.
   *
   * Uses 'which' on Unix-like systems and 'where' on Windows.
   *
   * @param command - Command name to check (e.g., 'speckit')
   * @returns True if command is available
   */
  async isCommandAvailable(command: string): Promise<boolean> {
    const checkCommand = process.platform === 'win32' ? 'where' : 'which';

    try {
      const result = await this.executeCommand(
        [checkCommand, command],
        process.cwd(),
        5000 // 5 second timeout for availability check
      );
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Execute a command and capture results.
   *
   * @param command - Command array [executable, ...args]
   * @param cwd - Working directory for execution
   * @param timeoutMs - Maximum execution time in milliseconds
   * @returns Execution result with stdout, stderr, exit code, and timeout flag
   */
  private executeCommand(
    command: string[],
    cwd: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<ExecuteResult> {
    return new Promise((resolve) => {
      const [executable, ...args] = command;
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let timedOut = false;
      let resolved = false;

      const child = spawn(executable, args, {
        cwd,
        shell: process.platform === 'win32', // Use shell on Windows for PATH resolution
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        // Give process time to terminate gracefully, then force kill
        setTimeout(() => {
          if (!resolved) {
            child.kill('SIGKILL');
          }
        }, 1000);
      }, timeoutMs);

      // Capture stdout
      child.stdout?.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });

      // Capture stderr
      child.stderr?.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });

      // Handle process exit
      child.on('close', (code) => {
        resolved = true;
        clearTimeout(timeoutId);

        resolve({
          success: code === 0,
          exitCode: code,
          stdout: Buffer.concat(stdoutChunks).toString('utf8'),
          stderr: Buffer.concat(stderrChunks).toString('utf8'),
          timedOut,
        });
      });

      // Handle spawn errors (e.g., command not found)
      child.on('error', (err) => {
        resolved = true;
        clearTimeout(timeoutId);

        resolve({
          success: false,
          exitCode: null,
          stdout: '',
          stderr: err.message,
          timedOut: false,
        });
      });
    });
  }

  /**
   * Build detailed error message per spec requirements.
   *
   * Includes: command, exit code, stderr snippet, suggested next steps.
   *
   * @param command - The command that failed
   * @param result - Execution result with error details
   * @returns Formatted error message
   */
  private buildErrorMessage(command: string[], result: ExecuteResult): string {
    const parts: string[] = [];

    // Command that was run
    parts.push(`Command: ${command.join(' ')}`);

    // Timeout indicator
    if (result.timedOut) {
      parts.push('Status: Timed out (exceeded timeout limit)');
    } else {
      parts.push(`Exit code: ${result.exitCode ?? 'unknown'}`);
    }

    // stderr snippet (truncate if too long)
    if (result.stderr.trim()) {
      const stderrSnippet = this.truncateOutput(result.stderr.trim(), 500);
      parts.push(`Error output:\n${stderrSnippet}`);
    }

    // Suggested next steps
    parts.push(this.suggestNextSteps(command, result));

    return parts.join('\n');
  }

  /**
   * Generate suggested remediation steps based on error type.
   */
  private suggestNextSteps(command: string[], result: ExecuteResult): string {
    if (result.timedOut) {
      return 'Suggestion: Increase timeout with --timeout flag or check if the command is stuck';
    }

    if (result.exitCode === 127 || result.stderr.includes('not found')) {
      return `Suggestion: Verify that '${command[0]}' is installed and available in PATH`;
    }

    if (result.exitCode === 1) {
      return 'Suggestion: Check the error output above for details on what went wrong';
    }

    return 'Suggestion: Run with --verbose flag for additional debugging information';
  }

  /**
   * Truncate output to a maximum length, adding ellipsis if truncated.
   */
  private truncateOutput(output: string, maxLength: number): string {
    if (output.length <= maxLength) {
      return output;
    }
    return output.substring(0, maxLength) + '\n... (output truncated)';
  }
}
