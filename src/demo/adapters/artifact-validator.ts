/**
 * ArtifactValidator Adapter
 *
 * FileSystemArtifactValidator implements the ArtifactValidator port interface using
 * Node.js fs module and gray-matter for frontmatter parsing. Validates artifact
 * existence, structure, and required sections. Supports verbose mode for detailed diagnostics.
 */

import { readFile, stat, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import matter from 'gray-matter';
import type { ArtifactValidator } from '../ports.js';
import type { PipelineStage, DemoConfiguration, DemoArtifact } from '../entities.js';
import { ArtifactType } from '../entities.js';
import type { Logger } from '../../cli/logger.js';
import { createNullLogger } from '../../cli/logger.js';

/** Required sections by artifact type */
const REQUIRED_SECTIONS: Record<ArtifactType, string[]> = {
  [ArtifactType.Spec]: ['## Overview', '## Requirements'],
  [ArtifactType.Plan]: ['## Architecture', '## Implementation'],
  [ArtifactType.Tasks]: ['## Tasks'],
  [ArtifactType.Review]: ['## Summary'],
};

/** Map artifact filenames to types */
const ARTIFACT_TYPE_MAP: Record<string, ArtifactType> = {
  'spec.md': ArtifactType.Spec,
  'plan.md': ArtifactType.Plan,
  'tasks.md': ArtifactType.Tasks,
  'review.md': ArtifactType.Review,
};

/**
 * Node.js implementation of ArtifactValidator using fs and gray-matter.
 *
 * Features:
 * - File existence and size validation
 * - YAML frontmatter parsing and validation
 * - Required section detection
 * - Detailed error reporting
 * - Verbose mode: logs each file check, size, rules applied, pass/fail status
 */
export class FileSystemArtifactValidator implements ArtifactValidator {
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createNullLogger();
  }

  /**
   * Validate a generated artifact file.
   *
   * Checks:
   * 1. File exists on filesystem
   * 2. File has valid YAML frontmatter
   * 3. Required sections are present based on artifact type
   *
   * @param artifactPath - Absolute path to the artifact file
   * @param stage - Pipeline stage that produced the artifact
   * @returns Artifact with validation status, size, and errors
   */
  async validate(artifactPath: string, stage: PipelineStage): Promise<DemoArtifact> {
    const filename = basename(artifactPath);
    const artifactType = this.getArtifactType(filename, stage.name);
    const errors: string[] = [];

    this.logger.verbose(`[validate] Checking artifact: ${artifactPath}`);
    this.logger.verbose(`[validate] Artifact type: ${artifactType} (from file: ${filename}, stage: ${stage.name})`);

    // Check file existence
    const fileStats = await this.getFileStats(artifactPath);
    if (!fileStats.exists) {
      this.logger.verbose(`[validate] ✗ File does not exist: ${artifactPath}`);
      return {
        path: artifactPath,
        type: artifactType,
        sizeBytes: 0,
        exists: false,
        valid: false,
        errors: [`File does not exist: ${artifactPath}`],
      };
    }

    this.logger.verbose(`[validate] File exists, size: ${fileStats.size} bytes`);

    // Read file content
    let content: string;
    try {
      content = await readFile(artifactPath, 'utf8');
      this.logger.verbose(`[validate] File read successfully (${content.length} characters)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.verbose(`[validate] ✗ Failed to read file: ${errorMessage}`);
      return {
        path: artifactPath,
        type: artifactType,
        sizeBytes: fileStats.size,
        exists: true,
        valid: false,
        errors: [`Failed to read file: ${errorMessage}`],
      };
    }

    // Validate frontmatter
    this.logger.verbose('[validate] Rule: YAML frontmatter check');
    const frontmatterResult = this.validateFrontmatter(content);
    if (!frontmatterResult.valid) {
      errors.push(...frontmatterResult.errors);
      this.logger.verbose(`[validate] ✗ Frontmatter check failed: ${frontmatterResult.errors.join(', ')}`);
    } else {
      this.logger.verbose('[validate] ✓ Frontmatter check passed');
    }

    // Validate required sections
    const requiredSections = REQUIRED_SECTIONS[artifactType] || [];
    this.logger.verbose(`[validate] Rule: Required sections check [${requiredSections.join(', ')}]`);
    const sectionsResult = this.validateRequiredSections(content, artifactType);
    if (!sectionsResult.valid) {
      errors.push(...sectionsResult.errors);
      this.logger.verbose(`[validate] ✗ Sections check failed: ${sectionsResult.errors.join(', ')}`);
    } else {
      this.logger.verbose('[validate] ✓ Sections check passed');
    }

    const valid = errors.length === 0;
    this.logger.verbose(`[validate] Result: ${valid ? 'PASS' : 'FAIL'} (${errors.length} errors)`);

    return {
      path: artifactPath,
      type: artifactType,
      sizeBytes: fileStats.size,
      exists: true,
      valid,
      errors,
    };
  }

  /**
   * Validate all artifacts in a demo directory.
   *
   * Scans the demoDir for markdown files matching known artifact types
   * and validates each one.
   *
   * @param config - Demo configuration with demoDir path
   * @returns Array of validated artifacts
   */
  async validateAll(config: DemoConfiguration): Promise<DemoArtifact[]> {
    const artifacts: DemoArtifact[] = [];
    const knownArtifacts = Object.keys(ARTIFACT_TYPE_MAP);

    this.logger.verbose(`[validateAll] Scanning directory: ${config.demoDir}`);

    let files: string[];
    try {
      files = await readdir(config.demoDir);
      this.logger.verbose(`[validateAll] Found ${files.length} files`);
    } catch {
      this.logger.verbose(`[validateAll] Directory not readable or does not exist`);
      // Directory doesn't exist or can't be read
      return [];
    }

    for (const file of files) {
      if (knownArtifacts.includes(file)) {
        const artifactPath = join(config.demoDir, file);
        const artifactType = ARTIFACT_TYPE_MAP[file];
        
        // Create a minimal stage for validation
        const stage: PipelineStage = {
          name: artifactType,
          displayName: artifactType,
          command: [],
          artifact: file,
          status: 'success' as import('../entities.js').StageStatus,
        };

        const artifact = await this.validate(artifactPath, stage);
        artifacts.push(artifact);
      }
    }

    this.logger.verbose(`[validateAll] Validated ${artifacts.length} artifacts`);

    return artifacts;
  }

  /**
   * Get file stats (existence and size).
   */
  private async getFileStats(filePath: string): Promise<{ exists: boolean; size: number }> {
    try {
      const stats = await stat(filePath);
      return { exists: true, size: stats.size };
    } catch {
      return { exists: false, size: 0 };
    }
  }

  /**
   * Determine artifact type from filename or stage name.
   */
  private getArtifactType(filename: string, stageName: string): ArtifactType {
    // First try filename mapping
    if (ARTIFACT_TYPE_MAP[filename]) {
      return ARTIFACT_TYPE_MAP[filename];
    }

    // Fall back to stage name mapping
    const stageMapping: Record<string, ArtifactType> = {
      specify: ArtifactType.Spec,
      plan: ArtifactType.Plan,
      tasks: ArtifactType.Tasks,
      review: ArtifactType.Review,
    };

    return stageMapping[stageName.toLowerCase()] || ArtifactType.Spec;
  }

  /**
   * Validate YAML frontmatter using gray-matter.
   */
  private validateFrontmatter(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if content starts with frontmatter delimiter
    if (!content.trim().startsWith('---')) {
      errors.push('Missing YAML frontmatter (file should start with ---)');
      return { valid: false, errors };
    }

    try {
      const parsed = matter(content);

      // Check if frontmatter was actually parsed (not empty)
      if (!parsed.data || Object.keys(parsed.data).length === 0) {
        errors.push('Frontmatter is empty or invalid');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push(`Invalid YAML frontmatter: ${errorMessage}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate that required sections are present in the content.
   */
  private validateRequiredSections(
    content: string,
    artifactType: ArtifactType
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredSections = REQUIRED_SECTIONS[artifactType] || [];

    for (const section of requiredSections) {
      if (!content.includes(section)) {
        errors.push(`Missing required section: ${section}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
