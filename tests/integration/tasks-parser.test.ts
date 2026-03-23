/**
 * T029 Tests: TasksParser Adapter
 *
 * Integration tests — tests the parser against real markdown formats.
 */

import { describe, it, expect } from 'vitest';
import { parseTasks } from '../../src/review/adapters/tasks-parser.js';

describe('TasksParser', () => {
  it('parses basic task lines with IDs', () => {
    const content = `
## Phase 1: Setup

- [ ] T001 Set up project structure
- [ ] T002 Configure TypeScript
- [x] T003 Initialize git repo
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].id).toBe('T001');
    expect(tasks[0].status).toBe('pending');
    expect(tasks[2].id).toBe('T003');
    expect(tasks[2].status).toBe('done');
  });

  it('extracts [USn] story labels', () => {
    const content = `
- [ ] T010 [US1] Implement authentication module
- [ ] T011 [US2] Build dashboard component
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toContain('US1');
    expect(tasks[1].title).toContain('US2');
  });

  it('extracts [P] priority markers', () => {
    const content = `
- [ ] T020 [P] Critical security fix in auth module
- [ ] T021 Regular task without priority
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].status).toBe('priority');
    expect(tasks[1].status).toBe('pending');
  });

  it('extracts dependencies from description text', () => {
    const content = `
- [ ] T030 Implement API routes — depends on T028, T029
- [ ] T031 Build frontend — requires T030
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].dependencies).toContain('T028');
    expect(tasks[0].dependencies).toContain('T029');
    expect(tasks[1].dependencies).toContain('T030');
  });

  it('handles phase headings', () => {
    const content = `
## Phase 1: Foundation

- [ ] T001 First task

## Phase 2: Implementation

- [ ] T002 Second task
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toContain('Phase 1: Foundation');
    expect(tasks[1].title).toContain('Phase 2: Implementation');
  });

  it('handles empty content gracefully', () => {
    const tasks = parseTasks('');
    expect(tasks).toEqual([]);
  });

  it('skips non-task lines', () => {
    const content = `
# Tasks

Some introductory text.

## Phase 1

- [ ] T001 The real task

- This is not a task
- Neither is this
* Nor this
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('T001');
  });

  it('handles 4-digit task IDs', () => {
    const content = `
- [ ] T0100 A four-digit task ID
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('T0100');
  });

  it('combines [USn] and [P] markers', () => {
    const content = `
- [ ] T050 [P] [US3] High-priority story task
`;

    const tasks = parseTasks(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('priority');
    expect(tasks[0].title).toContain('US3');
  });
});
