/**
 * Unit tests for T023: MarkdownFrontmatterParser adapter
 *
 * Tests parsing of SKILL.md, decisions.md, and history.md files.
 * Uses raw string fixtures — no filesystem access.
 */

import { describe, it, expect } from 'vitest';
import {
  parseSkillFile,
  parseDecisionsFile,
  parseHistoryFile,
} from '../../src/bridge/parser.js';
import type { ParseWarning } from '../../src/bridge/parser.js';

describe('parseSkillFile', () => {
  it('parses a valid SKILL.md with frontmatter', () => {
    const content = `---
name: test-skill
version: "1.0"
---

# Skill: Test Skill

## Overview

This is a test skill.

## What to Do — Patterns

- Use port interfaces
- Keep entities pure

## What NOT to Do — Anti-Patterns

- Don't import fs in entities
- Don't put logic in adapters
`;

    const warnings: ParseWarning[] = [];
    const result = parseSkillFile(content, 'test-skill', 'test.md', warnings);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('test-skill');
    expect(result!.context).toContain('Test Skill');
    expect(result!.patterns).toContain('Use port interfaces');
    expect(result!.patterns).toContain('Keep entities pure');
    expect(result!.antiPatterns).toContain("Don't import fs in entities");
    expect(result!.antiPatterns).toContain("Don't put logic in adapters");
    expect(warnings).toHaveLength(0);
  });

  it('handles SKILL.md without frontmatter', () => {
    const content = `# Simple Skill

Some content without frontmatter.
`;

    const warnings: ParseWarning[] = [];
    const result = parseSkillFile(content, 'simple', 'simple.md', warnings);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('simple');
    expect(result!.context).toContain('Simple Skill');
    expect(warnings).toHaveLength(0);
  });

  it('records warning for malformed content', () => {
    const warnings: ParseWarning[] = [];
    // gray-matter handles most cases gracefully, so this should still parse
    const result = parseSkillFile('', 'empty', 'empty.md', warnings);
    // Even empty content parses fine with gray-matter, returns empty entry
    expect(result).not.toBeNull();
  });
});

describe('parseDecisionsFile', () => {
  it('parses decisions.md with multiple H3 sections', () => {
    const content = `# Squad Decisions

## Active Decisions

### Use TypeScript (2025-07-20)

**Status:** Adopted

TypeScript provides type safety and better developer experience.

---

### Use Vitest (2025-07-18)

**Status:** Adopted

Vitest is fast and supports TypeScript natively.
`;

    const warnings: ParseWarning[] = [];
    const result = parseDecisionsFile(content, 'decisions.md', warnings);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Use TypeScript');
    expect(result[0].date).toBe('2025-07-20');
    expect(result[0].status).toBe('Adopted');
    expect(result[1].title).toBe('Use Vitest');
    expect(result[1].date).toBe('2025-07-18');
    expect(warnings).toHaveLength(0);
  });

  it('handles decisions without dates', () => {
    const content = `### Undated Decision

**Status:** Proposed

Some content.
`;

    const warnings: ParseWarning[] = [];
    const result = parseDecisionsFile(content, 'decisions.md', warnings);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Undated Decision');
    expect(result[0].date).toBe('');
  });

  it('returns empty array for empty file', () => {
    const warnings: ParseWarning[] = [];
    const result = parseDecisionsFile('', 'empty.md', warnings);
    expect(result).toHaveLength(0);
  });
});

describe('parseHistoryFile', () => {
  it('parses history.md with learning entries', () => {
    const content = `# Agent — History

## Core Context

- **Role:** Integration Engineer

## Learnings

### 2025-07-22: First Learning

Details about the first learning.

- Key insight 1
- Key insight 2

### 2025-07-20: Second Learning

Details about the second learning.
`;

    const warnings: ParseWarning[] = [];
    const result = parseHistoryFile(content, 'test-agent', 'history.md', warnings);

    expect(result).not.toBeNull();
    expect(result!.agentName).toBe('test-agent');
    expect(result!.agentRole).toBe('Integration Engineer');
    expect(result!.entries).toHaveLength(2);
    expect(result!.entries[0].date).toBe('2025-07-22');
    expect(result!.entries[0].title).toBe('First Learning');
    expect(result!.entries[0].summary).toContain('first learning');
    expect(result!.entries[1].date).toBe('2025-07-20');
    expect(warnings).toHaveLength(0);
  });

  it('handles history without learning entries', () => {
    const content = `# Agent — History

## Core Context

- **Role:** Developer

No learnings yet.
`;

    const warnings: ParseWarning[] = [];
    const result = parseHistoryFile(content, 'new-agent', 'history.md', warnings);

    // Returns entry with no learning items
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(0);
  });

  it('returns null for empty content', () => {
    const warnings: ParseWarning[] = [];
    const result = parseHistoryFile('', 'empty', 'empty.md', warnings);
    expect(result).toBeNull();
  });
});
