# squadvsspeckit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-25

## Active Technologies
- TypeScript 5.x / Node.js 18+ + gray-matter (markdown frontmatter parsing), glob (file discovery), commander (CLI interface), @octokit/rest (GitHub API for issues command) (002-v02-fixes-automation)
- File system (`.squad/` and `.specify/` directories) + GitHub API (issues) — no database (002-v02-fixes-automation)
- TypeScript 5.9.3, Node.js 18+ + Commander.js 14.0.3 (CLI framework), Node.js child_process (pipeline execution), gray-matter 4.0.3 (frontmatter parsing for validation) (003-e2e-demo-script)
- Filesystem only - temporary spec directories under `specs/demo-{timestamp}/` (003-e2e-demo-script)
- TypeScript 5.9+ / Node.js ≥18 (ESM, `"type": "module"`) + commander ^14.0.3 (CLI), gray-matter ^4.0.3 (frontmatter parsing), glob ^13.0.6 (file matching) (004-bridge-self-validation)
- File system only — `.squad/` (Squad memory), `.specify/` (SpecKit config), `specs/` (feature artifacts) (004-bridge-self-validation)
- TypeScript 5.x, ES2022 target, Node16 module system + Commander.js (CLI), Vitest (testing), tsx (dev runner) (008-fix-version-display)
- File system — `.bridge-manifest.json` written during install (008-fix-version-display)
- TypeScript 5.9, ES2022 target, ESM (`"type": "module"`) + commander 14.x (CLI), glob 13.x (file discovery), gray-matter 4.x (markdown frontmatter) (009-knowledge-feedback-loop)
- File-based (markdown output, JSON state files: `.bridge-sync-reverse.json`) (009-knowledge-feedback-loop)

- TypeScript 5.x / Node.js 18+ + gray-matter (markdown frontmatter parsing), glob (file discovery), commander (CLI interface) (001-squad-speckit-bridge)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x / Node.js 18+: Follow standard conventions

## Recent Changes
- 009-knowledge-feedback-loop: Added TypeScript 5.9, ES2022 target, ESM (`"type": "module"`) + commander 14.x (CLI), glob 13.x (file discovery), gray-matter 4.x (markdown frontmatter)
- 008-fix-version-display: Added TypeScript 5.x, ES2022 target, Node16 module system + Commander.js (CLI), Vitest (testing), tsx (dev runner)
- 004-bridge-self-validation: Added TypeScript 5.9+ / Node.js ≥18 (ESM, `"type": "module"`) + commander ^14.0.3 (CLI), gray-matter ^4.0.3 (frontmatter parsing), glob ^13.0.6 (file matching)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
