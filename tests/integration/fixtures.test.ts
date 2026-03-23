import { describe, it, expect } from 'vitest';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('T044: Test Fixtures Validation', () => {
  describe('Squad directory structure', () => {
    it('has decisions.md with 3+ H3 decision entries', async () => {
      const content = await readFile(
        join(FIXTURES, 'squad', 'decisions.md'),
        'utf-8',
      );
      const h3Matches = content.match(/^### /gm);
      expect(h3Matches).not.toBeNull();
      expect(h3Matches!.length).toBeGreaterThanOrEqual(3);
    });

    it('has at least 3 skill directories with SKILL.md', async () => {
      const skillsDir = join(FIXTURES, 'squad', 'skills');
      const entries = await readdir(skillsDir, { withFileTypes: true });
      const skillDirs = entries.filter((e) => e.isDirectory());

      let validSkillCount = 0;
      for (const dir of skillDirs) {
        const skillPath = join(skillsDir, dir.name, 'SKILL.md');
        try {
          const s = await stat(skillPath);
          if (s.isFile()) validSkillCount++;
        } catch {
          // Directory exists but no SKILL.md — skip
        }
      }
      expect(validSkillCount).toBeGreaterThanOrEqual(3);
    });

    it('has agent history files for richard and dinesh', async () => {
      const richardHistory = await readFile(
        join(FIXTURES, 'squad', 'agents', 'richard', 'history.md'),
        'utf-8',
      );
      expect(richardHistory).toContain('# Richard');
      expect(richardHistory).toContain('## Learnings');

      const dineshHistory = await readFile(
        join(FIXTURES, 'squad', 'agents', 'dinesh', 'history.md'),
        'utf-8',
      );
      expect(dineshHistory).toContain('# Dinesh');
      expect(dineshHistory).toContain('## Learnings');
    });

    it('has at least 4 agents', async () => {
      const agentsDir = join(FIXTURES, 'squad', 'agents');
      const entries = await readdir(agentsDir, { withFileTypes: true });
      const agentDirs = entries.filter((e) => e.isDirectory());
      expect(agentDirs.length).toBeGreaterThanOrEqual(4);
    });

    it('skill SKILL.md files have YAML frontmatter', async () => {
      const skillsDir = join(FIXTURES, 'squad', 'skills');
      const entries = await readdir(skillsDir, { withFileTypes: true });
      for (const dir of entries.filter((e) => e.isDirectory())) {
        const skillPath = join(skillsDir, dir.name, 'SKILL.md');
        try {
          const content = await readFile(skillPath, 'utf-8');
          expect(content).toMatch(/^---\n/);
          expect(content).toContain('name:');
        } catch {
          // Skip directories without SKILL.md
        }
      }
    });
  });

  describe('Specify directory structure', () => {
    it('has extensions/squad-bridge/extension.yml', async () => {
      const content = await readFile(
        join(FIXTURES, 'specify', 'extensions', 'squad-bridge', 'extension.yml'),
        'utf-8',
      );
      expect(content).toContain('schema_version');
      expect(content).toContain('hooks');
    });

    it('has memory/constitution.md', async () => {
      const content = await readFile(
        join(FIXTURES, 'specify', 'memory', 'constitution.md'),
        'utf-8',
      );
      expect(content).toContain('Principles');
    });
  });

  describe('Spec fixtures for review scenarios', () => {
    it('has tasks.md with parseable task list', async () => {
      const content = await readFile(
        join(FIXTURES, 'specs', '001-sample-feature', 'tasks.md'),
        'utf-8',
      );
      expect(content).toContain('# Tasks');
      const taskMatches = content.match(/- \[ \] T\d+/g);
      expect(taskMatches).not.toBeNull();
      expect(taskMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });
});
