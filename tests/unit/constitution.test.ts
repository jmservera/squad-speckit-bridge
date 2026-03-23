import { describe, it, expect } from 'vitest';
import {
  detectConstitution,
  type ConstitutionStatus,
} from '../../src/types.js';

describe('detectConstitution', () => {
  it('returns not-exists when content is null', () => {
    const result = detectConstitution(null);
    expect(result.exists).toBe(false);
    expect(result.isTemplate).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('No constitution.md found');
  });

  it('detects empty constitution as template', () => {
    const result = detectConstitution('');
    expect(result.exists).toBe(true);
    expect(result.isTemplate).toBe(true);
    expect(result.warnings[0]).toContain('empty');
  });

  it('detects [PLACEHOLDER] marker as template', () => {
    const result = detectConstitution('# Constitution\n\n[PLACEHOLDER] — replace with real principles');
    expect(result.exists).toBe(true);
    expect(result.isTemplate).toBe(true);
    expect(result.warnings[0]).toContain('uncustomized template');
  });

  it('detects [PROJECT_NAME] marker as template', () => {
    const result = detectConstitution('# [PROJECT_NAME] Constitution\n\nThis is a template.');
    expect(result.isTemplate).toBe(true);
  });

  it('detects TODO: marker as template', () => {
    const result = detectConstitution('# Constitution\n\nTODO: Add project principles here');
    expect(result.isTemplate).toBe(true);
  });

  it('accepts customized constitution', () => {
    const content = `# Project Constitution

## Core Principles

1. Clean Architecture boundaries are enforced
2. All code changes require tests
3. Squad team coordinates via ceremonies`;

    const result = detectConstitution(content);
    expect(result.exists).toBe(true);
    expect(result.isTemplate).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('handles whitespace-only content as empty', () => {
    const result = detectConstitution('   \n  \n  ');
    expect(result.isTemplate).toBe(true);
    expect(result.warnings[0]).toContain('empty');
  });
});
