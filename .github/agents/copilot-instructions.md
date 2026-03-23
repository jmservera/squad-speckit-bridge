# squadvsspeckit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-23

## Active Technologies
- TypeScript 5.x / Node.js 18+ + gray-matter (markdown frontmatter parsing), glob (file discovery), commander (CLI interface), @octokit/rest (GitHub API for issues command) (002-v02-fixes-automation)
- File system (`.squad/` and `.specify/` directories) + GitHub API (issues) — no database (002-v02-fixes-automation)
- TypeScript 5.9.3, Node.js 18+ + Commander.js 14.0.3 (CLI framework), Node.js child_process (pipeline execution), gray-matter 4.0.3 (frontmatter parsing for validation) (003-e2e-demo-script)
- Filesystem only - temporary spec directories under `specs/demo-{timestamp}/` (003-e2e-demo-script)

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
- 003-e2e-demo-script: Added TypeScript 5.9.3, Node.js 18+ + Commander.js 14.0.3 (CLI framework), Node.js child_process (pipeline execution), gray-matter 4.0.3 (frontmatter parsing for validation)
- 002-v02-fixes-automation: Added TypeScript 5.x / Node.js 18+ + gray-matter (markdown frontmatter parsing), glob (file discovery), commander (CLI interface), @octokit/rest (GitHub API for issues command)

- 001-squad-speckit-bridge: Added TypeScript 5.x / Node.js 18+ + gray-matter (markdown frontmatter parsing), glob (file discovery), commander (CLI interface)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
