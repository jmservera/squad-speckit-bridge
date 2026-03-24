/**
 * CleanupHandler Adapter
 *
 * FileSystemCleanupHandler implements the CleanupHandler port interface using
 * Node.js fs.rm(). Handles safe deletion of demo directories under specs/.
 */

import { rm, stat, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import type { CleanupHandler } from '../ports.js';
import type { DemoConfiguration, ExecutionReport } from '../entities.js';

/** Result of a cleanup operation */
export interface CleanupResult {
  /** Whether cleanup completed successfully */
  success: boolean;
  /** Number of files/directories removed */
  filesRemoved: number;
  /** Error message if cleanup failed */
  error?: string;
}

/**
 * Node.js implementation of CleanupHandler using fs.rm().
 *
 * Features:
 * - Recursive directory deletion with fs.rm({ recursive: true })
 * - Path safety check: only deletes directories under specs/
 * - File count tracking for cleanup summary
 */
export class FileSystemCleanupHandler implements CleanupHandler {
  /**
   * Clean up demo artifacts based on configuration.
   *
   * If config.flags.keep is true, no cleanup is performed.
   * If config.flags.keep is false, demoDir and its contents are deleted.
   *
   * @param config - Demo configuration with flags and demoDir
   * @param report - Execution report to update with cleanup status
   * @returns Updated report with cleanupPerformed flag
   */
  async cleanup(
    config: DemoConfiguration,
    report: ExecutionReport
  ): Promise<ExecutionReport> {
    // If keep flag is set, skip cleanup and populate artifact paths
    if (config.flags.keep) {
      const artifactPaths = [config.demoDir];
      for (const artifact of report.artifacts ?? []) {
        artifactPaths.push(artifact.path);
      }
      return {
        ...report,
        cleanupPerformed: false,
        kept: true,
        artifactPaths,
      };
    }

    // Validate path safety before deletion
    const isSafe = await this.isSafeToDelete(config.demoDir);
    if (!isSafe) {
      return {
        ...report,
        cleanupPerformed: false,
        kept: false,
        artifactPaths: [],
        errorSummary: report.errorSummary
          ? `${report.errorSummary}; Cleanup skipped: path not safe to delete`
          : 'Cleanup skipped: path not safe to delete',
      };
    }

    // Perform cleanup
    const result = await this.performCleanup(config.demoDir);

    if (!result.success) {
      return {
        ...report,
        cleanupPerformed: false,
        kept: false,
        artifactPaths: [],
        errorSummary: report.errorSummary
          ? `${report.errorSummary}; Cleanup failed: ${result.error}`
          : `Cleanup failed: ${result.error}`,
      };
    }

    return {
      ...report,
      cleanupPerformed: true,
      kept: false,
      artifactPaths: [],
    };
  }

  /**
   * Check if a directory exists and is safe to delete.
   *
   * T034: Validates the path is within expected boundaries (under specs/ or temp/).
   * Refuses to delete paths outside safe zones.
   *
   * @param path - Directory path to check
   * @returns True if directory exists and is safe to delete
   */
  async isSafeToDelete(path: string): Promise<boolean> {
    try {
      // Resolve to absolute path
      const absolutePath = resolve(path);

      // Check if path is under an allowed directory
      const relativePath = relative(process.cwd(), absolutePath);

      // Ensure path doesn't contain parent directory traversal
      if (relativePath.includes('..')) {
        return false;
      }

      // Reject empty or root-equivalent paths
      if (!relativePath || relativePath === '.' || relativePath === sep) {
        return false;
      }

      // T034: Path must start with an allowed prefix (require subdirectory, reject zone roots)
      const safePrefixes = [`specs${sep}`, `temp${sep}`];
      const isUnderSafeZone = safePrefixes.some(p => relativePath.startsWith(p));

      if (!isUnderSafeZone) {
        return false;
      }

      // Verify directory exists
      const stats = await stat(absolutePath);
      return stats.isDirectory();
    } catch {
      // Directory doesn't exist or access error
      return false;
    }
  }

  /**
   * Perform the actual cleanup operation.
   *
   * @param dirPath - Directory to delete
   * @returns CleanupResult with success status and file count
   */
  private async performCleanup(dirPath: string): Promise<CleanupResult> {
    try {
      const absolutePath = resolve(dirPath);

      // Count files before deletion
      const filesRemoved = await this.countFiles(absolutePath);

      // Remove directory recursively
      await rm(absolutePath, { recursive: true, force: true });

      return {
        success: true,
        filesRemoved,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        filesRemoved: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Count all files and directories in a path recursively.
   *
   * @param dirPath - Directory to count contents of
   * @returns Total count of files and directories
   */
  private async countFiles(dirPath: string): Promise<number> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      let count = entries.length;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = resolve(dirPath, entry.name);
          count += await this.countFiles(subPath);
        }
      }

      return count;
    } catch {
      return 0;
    }
  }
}
