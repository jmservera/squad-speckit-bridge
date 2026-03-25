import { describe, it, expect } from 'vitest';
import {
  classifyLearning,
  categorizeLearning,
  isValidReverseSyncOptions,
} from '../../src/types.js';
import type { ReverseSyncOptions } from '../../src/types.js';

// ── Helper ───────────────────────────────────────────────────────

function makeOptions(overrides: Partial<ReverseSyncOptions> = {}): ReverseSyncOptions {
  return {
    specDir: '/project/specs/009',
    squadDir: '/project/.squad',
    dryRun: false,
    cooldownMs: 0,
    sources: ['histories', 'decisions', 'skills'],
    skipConstitution: true,
    ...overrides,
  };
}

// ── classifyLearning ─────────────────────────────────────────────

describe('classifyLearning', () => {
  describe('constitution-worthy signals', () => {
    it('classifies "non-negotiable" as constitution-worthy', () => {
      expect(classifyLearning('Rule', 'This is a non-negotiable constraint for all APIs.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "MUST" (uppercase) as constitution-worthy', () => {
      expect(classifyLearning('API rule', 'All public endpoints MUST support versioning.')).toBe(
        'constitution-worthy',
      );
    });

    it('does NOT classify lowercase "must" as constitution-worthy', () => {
      expect(classifyLearning('Tip', 'You must run tests before committing.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "all features" as constitution-worthy', () => {
      expect(classifyLearning('Standard', 'Applies to all features in the platform.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "every spec" as constitution-worthy', () => {
      expect(classifyLearning('Guideline', 'Every spec must include success criteria.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "project-wide" as constitution-worthy', () => {
      expect(classifyLearning('Convention', 'This is a project-wide convention.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "architectural constraint" as constitution-worthy', () => {
      expect(classifyLearning('Design', 'An architectural constraint on the data layer.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "API contract" as constitution-worthy', () => {
      expect(classifyLearning('API', 'The API contract must not break backward compatibility.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "compatibility requirement" as constitution-worthy', () => {
      expect(classifyLearning('Compat', 'There is a compatibility requirement for Node 18+.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "version negotiation" as constitution-worthy', () => {
      expect(classifyLearning('Versions', 'Implement version negotiation for all endpoints.')).toBe(
        'constitution-worthy',
      );
    });

    it('classifies "breaking change" as constitution-worthy', () => {
      expect(classifyLearning('Warning', 'This constitutes a breaking change to the schema.')).toBe(
        'constitution-worthy',
      );
    });
  });

  describe('learnings-only signals', () => {
    it('classifies "code pattern" as learnings-only', () => {
      expect(classifyLearning('Pattern', 'Use this code pattern for async handlers.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "testing technique" as learnings-only', () => {
      expect(classifyLearning('Testing', 'A testing technique for mocking file I/O.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "debug" as learnings-only', () => {
      expect(classifyLearning('Debug', 'Use debug logging to trace the issue.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "workaround" as learnings-only', () => {
      expect(classifyLearning('Fix', 'Applied a workaround for the flaky test.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "vi.doMock" as learnings-only', () => {
      expect(classifyLearning('Mocking', 'Use vi.doMock for dynamic imports.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "implementation detail" as learnings-only', () => {
      expect(classifyLearning('Detail', 'This is an implementation detail of the parser.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "config tweak" as learnings-only', () => {
      expect(classifyLearning('Config', 'A config tweak for faster builds.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "hot fix" as learnings-only', () => {
      expect(classifyLearning('Hotfix', 'Applied a hot fix to the deployment script.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "refactor" as learnings-only', () => {
      expect(classifyLearning('Cleanup', 'A refactor of the validation module.')).toBe(
        'learnings-only',
      );
    });

    it('classifies "import path" as learnings-only', () => {
      expect(classifyLearning('Imports', 'Fixed the import path for shared utils.')).toBe(
        'learnings-only',
      );
    });

    it('classifies content with file references as learnings-only', () => {
      expect(classifyLearning('Fix', 'See types.ts:42 for the root cause.')).toBe(
        'learnings-only',
      );
    });
  });

  describe('conservative default behavior', () => {
    it('defaults to learnings-only when no signals match', () => {
      expect(classifyLearning('Observation', 'Something interesting happened.')).toBe(
        'learnings-only',
      );
    });

    it('returns learnings-only when BOTH signal sets match (conservative)', () => {
      // Has both "non-negotiable" (constitution) AND "workaround" (learnings)
      expect(
        classifyLearning('Rule', 'This non-negotiable principle has a workaround in testing.'),
      ).toBe('learnings-only');
    });

    it('returns learnings-only when constitution signal + file reference', () => {
      expect(
        classifyLearning('MUST rule', 'All APIs MUST comply. See api.ts:10 for details.'),
      ).toBe('learnings-only');
    });
  });
});

// ── categorizeLearning ───────────────────────────────────────────

describe('categorizeLearning', () => {
  it('categorizes architecture keywords', () => {
    expect(categorizeLearning('Layers', 'The clean architecture layer separation is key.')).toBe(
      'architectural-insights',
    );
  });

  it('categorizes "dependency" as architectural-insights', () => {
    expect(categorizeLearning('Deps', 'Manage dependency injection carefully.')).toBe(
      'architectural-insights',
    );
  });

  it('categorizes "structure" as architectural-insights', () => {
    expect(categorizeLearning('Layout', 'The project structure follows hexagonal design.')).toBe(
      'architectural-insights',
    );
  });

  it('categorizes integration keywords', () => {
    expect(categorizeLearning('APIs', 'The API endpoint design follows REST conventions.')).toBe(
      'integration-patterns',
    );
  });

  it('categorizes "protocol" as integration-patterns', () => {
    expect(categorizeLearning('Comms', 'Use the gRPC protocol for inter-service calls.')).toBe(
      'integration-patterns',
    );
  });

  it('categorizes "handoff" as integration-patterns', () => {
    expect(categorizeLearning('Flow', 'The handoff between services needs retry logic.')).toBe(
      'integration-patterns',
    );
  });

  it('categorizes performance keywords', () => {
    expect(categorizeLearning('Speed', 'Latency reduced by 40% after caching.')).toBe(
      'performance-notes',
    );
  });

  it('categorizes "throughput" as performance-notes', () => {
    expect(categorizeLearning('Perf', 'Throughput doubled after batch processing.')).toBe(
      'performance-notes',
    );
  });

  it('categorizes "memory" as performance-notes', () => {
    expect(categorizeLearning('Resources', 'Memory usage spiked under load.')).toBe(
      'performance-notes',
    );
  });

  it('categorizes decision keywords', () => {
    expect(categorizeLearning('Choice', 'We chose TypeScript over JavaScript.')).toBe('decisions');
  });

  it('categorizes "adopted" as decisions', () => {
    expect(categorizeLearning('Framework', 'We adopted Vitest for testing.')).toBe('decisions');
  });

  it('categorizes "rejected" as decisions', () => {
    expect(categorizeLearning('Eval', 'We rejected Mocha due to ESM issues.')).toBe('decisions');
  });

  it('categorizes "trade-off" as decisions', () => {
    expect(categorizeLearning('Balance', 'There is a trade-off between speed and safety.')).toBe(
      'decisions',
    );
  });

  it('categorizes technique keywords', () => {
    expect(categorizeLearning('Skill', 'A reusable utility for date formatting.')).toBe(
      'reusable-techniques',
    );
  });

  it('categorizes "pattern" as reusable-techniques', () => {
    expect(categorizeLearning('Code', 'The observer pattern simplified event handling.')).toBe(
      'reusable-techniques',
    );
  });

  it('categorizes risk keywords', () => {
    expect(categorizeLearning('Alert', 'A regression in the auth module was detected.')).toBe(
      'risks',
    );
  });

  it('categorizes "vulnerability" as risks', () => {
    expect(categorizeLearning('Security', 'A vulnerability in the input parser was found.')).toBe(
      'risks',
    );
  });

  it('categorizes "edge case" as risks', () => {
    expect(categorizeLearning('Bug', 'An edge case with empty arrays caused a crash.')).toBe(
      'risks',
    );
  });

  it('categorizes "failure" as risks', () => {
    expect(categorizeLearning('Incident', 'Network failure handling was insufficient.')).toBe(
      'risks',
    );
  });

  it('defaults to architectural-insights for unclassified content', () => {
    expect(categorizeLearning('Note', 'Something we noticed during development.')).toBe(
      'architectural-insights',
    );
  });
});

// ── isValidReverseSyncOptions ────────────────────────────────────

describe('isValidReverseSyncOptions', () => {
  it('accepts valid options with skipConstitution=true', () => {
    expect(isValidReverseSyncOptions(makeOptions())).toBe(true);
  });

  it('accepts valid options with constitutionPath when skipConstitution=false', () => {
    expect(
      isValidReverseSyncOptions(
        makeOptions({
          skipConstitution: false,
          constitutionPath: '/project/.specify/memory/constitution.md',
        }),
      ),
    ).toBe(true);
  });

  it('rejects empty specDir', () => {
    expect(isValidReverseSyncOptions(makeOptions({ specDir: '' }))).toBe(false);
  });

  it('rejects whitespace-only specDir', () => {
    expect(isValidReverseSyncOptions(makeOptions({ specDir: '   ' }))).toBe(false);
  });

  it('rejects empty squadDir', () => {
    expect(isValidReverseSyncOptions(makeOptions({ squadDir: '' }))).toBe(false);
  });

  it('rejects whitespace-only squadDir', () => {
    expect(isValidReverseSyncOptions(makeOptions({ squadDir: '  ' }))).toBe(false);
  });

  it('rejects negative cooldownMs', () => {
    expect(isValidReverseSyncOptions(makeOptions({ cooldownMs: -1 }))).toBe(false);
  });

  it('accepts zero cooldownMs', () => {
    expect(isValidReverseSyncOptions(makeOptions({ cooldownMs: 0 }))).toBe(true);
  });

  it('rejects empty sources array', () => {
    expect(isValidReverseSyncOptions(makeOptions({ sources: [] }))).toBe(false);
  });

  it('rejects invalid source values', () => {
    expect(
      isValidReverseSyncOptions(
        makeOptions({ sources: ['invalid' as any] }),
      ),
    ).toBe(false);
  });

  it('accepts a single valid source', () => {
    expect(isValidReverseSyncOptions(makeOptions({ sources: ['decisions'] }))).toBe(true);
  });

  it('rejects when skipConstitution is false and constitutionPath is missing', () => {
    expect(
      isValidReverseSyncOptions(
        makeOptions({ skipConstitution: false, constitutionPath: undefined }),
      ),
    ).toBe(false);
  });

  it('rejects when skipConstitution is false and constitutionPath is empty', () => {
    expect(
      isValidReverseSyncOptions(
        makeOptions({ skipConstitution: false, constitutionPath: '' }),
      ),
    ).toBe(false);
  });

  it('rejects when skipConstitution is false and constitutionPath is whitespace', () => {
    expect(
      isValidReverseSyncOptions(
        makeOptions({ skipConstitution: false, constitutionPath: '  ' }),
      ),
    ).toBe(false);
  });
});
