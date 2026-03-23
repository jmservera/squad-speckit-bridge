import { describe, it, expect } from 'vitest';
import {
  ErrorCodes,
  ErrorSuggestions,
  createStructuredError,
} from '../../src/types.js';
import type { ErrorCode, StructuredError } from '../../src/types.js';

describe('T041: Error Code Constants', () => {
  it('defines all 7 error codes from CLI contract', () => {
    expect(ErrorCodes.SQUAD_NOT_FOUND).toBe('SQUAD_NOT_FOUND');
    expect(ErrorCodes.SPECKIT_NOT_FOUND).toBe('SPECKIT_NOT_FOUND');
    expect(ErrorCodes.SPEC_DIR_NOT_FOUND).toBe('SPEC_DIR_NOT_FOUND');
    expect(ErrorCodes.TASKS_NOT_FOUND).toBe('TASKS_NOT_FOUND');
    expect(ErrorCodes.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
    expect(ErrorCodes.CONFIG_INVALID).toBe('CONFIG_INVALID');
    expect(ErrorCodes.PARSE_ERROR).toBe('PARSE_ERROR');
  });

  it('has exactly 7 error codes', () => {
    expect(Object.keys(ErrorCodes)).toHaveLength(7);
  });

  it('provides a suggestion for every error code', () => {
    for (const code of Object.values(ErrorCodes)) {
      expect(ErrorSuggestions[code]).toBeDefined();
      expect(typeof ErrorSuggestions[code]).toBe('string');
      expect(ErrorSuggestions[code].length).toBeGreaterThan(0);
    }
  });

  it('createStructuredError produces correct shape', () => {
    const err = createStructuredError(
      ErrorCodes.SQUAD_NOT_FOUND,
      'Squad directory not found at .squad/',
    );
    expect(err).toEqual({
      error: true,
      code: 'SQUAD_NOT_FOUND',
      message: 'Squad directory not found at .squad/',
      suggestion: ErrorSuggestions.SQUAD_NOT_FOUND,
    });
  });

  it('createStructuredError accepts custom suggestion', () => {
    const err = createStructuredError(
      ErrorCodes.CONFIG_INVALID,
      'Bad config',
      'Try deleting bridge.config.json and re-running install.',
    );
    expect(err.suggestion).toBe(
      'Try deleting bridge.config.json and re-running install.',
    );
  });

  it('ErrorCode type restricts to valid codes', () => {
    const code: ErrorCode = ErrorCodes.PARSE_ERROR;
    expect(code).toBe('PARSE_ERROR');
  });

  it('StructuredError has error: true', () => {
    const err: StructuredError = createStructuredError(
      ErrorCodes.PERMISSION_DENIED,
      'Cannot write to .squad/',
    );
    expect(err.error).toBe(true);
  });
});
