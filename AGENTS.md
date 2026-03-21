# AGENTS.md

Project-wide defaults for AI coding agents. Keep this file focused on always-followed repository rules.

### Do

- Prioritize performance, robustness, and maintainability in every change.
- Keep modules small and focused (single responsibility).
- Apply DRY and divide-and-conquer: extract reusable helpers/constants when repetition appears.
- Follow existing architecture layers: `config -> utils -> lib -> features -> app`.
- Keep code flow readable from top to bottom (public entry points first, helpers later).
- Centralize reusable UI strings in `src/config/messages.js`.
- Before building new UI patterns/components, verify and reuse existing ones in the codebase whenever possible.
- For every new feature or behavior change, add or update automated tests in the same change.
- When improving/refactoring existing behavior, update related tests so they stay faithful to expected behavior.
- Keep the automated suite focused on critical paths (core business flows, regressions and safety checks); avoid adding low-value or redundant tests.
- For every new user-facing feature, update `README.md` under the `Funcionalidades` section in the same PR.
- For every new release version, update the latest entry first in `src/app/popup/changelog.json` and then regenerate `CHANGELOG.md` from that source.
- Keep release change lists clear and ordered by impact, using simple Spanish for end users (avoid unnecessary technical jargon).
- Validate all boundary inputs (DOM, API payloads, URL data, cross-context messages).
- Use safe DOM APIs (`textContent`) for user text; avoid unsafe HTML insertion.
- Prefer DOM node construction (`createElement`, `replaceChildren`, `append`) over HTML string injection to reduce security/performance warnings in store validators.
- Treat extension-store validator warnings as release blockers when they affect security or unsafe DOM patterns; fix them before packaging.
- Run focused pre-release checks for touched areas (`eslint`, critical tests, and target build) to keep warning count near zero.
- Keep comments in English and only for non-obvious intent/complexity.
- Keep code identifiers in English (`variables`, `functions`, `constants`, `classes`).
- Keep documentation content in Spanish when it is project docs, except files that are explicitly English.
- If a Markdown document is written in Spanish, keep all headings and body text in Spanish (no mixed-language subtitles).
- Keep `.github` issue/PR template content fully in Spanish.
- Follow Airbnb-style JavaScript conventions (small functions, guard clauses, no magic numbers, clear names).

### Don't

- Do not add heavy dependencies without explicit approval.
- Do not do broad repo-wide rewrites unless requested.
- Do not duplicate repeated UI messages across feature files.
- Do not bypass secure message helpers for page/content bridge communication.
- Do not leave dead code, commented-out code, or noisy comments.
- Do not grow the test suite with non-critical coverage that increases maintenance cost without reducing real risk.
- Do not add new dynamic `innerHTML`/`outerHTML` assignments for UI rendering.
- Do not ignore validator/security warnings from Chrome Web Store or Firefox Add-ons; resolve or explicitly document unavoidable cases.
- Do not use destructive git operations or revert unrelated user changes.
- LLM agents must not execute `git add`, `git commit`, or `git push` commands. They should only suggest commands for the user to run.

### Commands

File-scoped checks preferred when possible:

- `npx eslint src/path/to/file.js`

Project checks:

- `npm run lint`
- `npm run test:run`
- `npm run test`
- `npm run changelog:generate`
- `npm run build:dev -- --target all`
- `npm run build:prod -- --target all --firefox-update-url https://example.com/updates.json`
- `npm run build`
- `npm run build:firefox`

Release flow:

- `npm run release:prepare`
- `npm run release:publish:firefox`

### Safety and permissions

Allowed without prompt:

- Read/list/search files.
- Edit source and docs in requested scope.
- Run lint/test/build commands needed to validate changes.

Ask first:

- Installing/removing/upgrading dependencies.
- Deleting files/directories.
- Running release/publish commands against real environments.
- Large speculative refactors outside requested scope.

### Project structure

- `src/config/*`: constants, domains, message catalogs, action/message types.
- `src/utils/*`: shared low-level helpers.
- `src/lib/*`: bridge/editor/storage integration layer.
- `src/features/*`: feature modules by domain (tickets, formatter, installations, etc.).
- `src/app/page.js`: main-world entry point.
- `src/app/content.js`: isolated-world entry point.
- `src/app/background.js`: service worker.
- `src/app/popup/*`: popup UI and behavior.

### Good and bad examples

Prefer:

- Message catalogs in `src/config/messages.js`.
- Secure page bridge helpers in `src/utils/pageBridge.js`.
- Layer-aware messaging in `src/lib/messaging/bridge.js`.
- Focused feature modules (example: `src/features/tickets/ticketActions.js`).

Avoid:

- Repeated hardcoded UI strings spread across files.
- Cross-layer imports that violate the architecture flow.
- Direct unsafe DOM injection patterns.

### API docs

- Build/release operational reference: `docs/BUILD_INSTRUCTIONS.md`
- Script workflow reference: `scripts/README.md`
- Coding standards and quality criteria: `docs/CODE_STANDARDS.md`
- Product/feature overview: `README.md`

### Test organization

- Keep tests grouped by feature/domain to mirror `src/features/*`.
- Prefer paths like `tests/unit/features/<feature>/<module>.test.js`.
- If a module lives under a nested feature path (for example `src/features/formatter/utils/*`), mirror that nesting in tests.

### PR checklist

- Diff is small and scoped to the request.
- Lint passes.
- Relevant tests pass.
- No new validator-style warnings introduced by the change set (especially unsafe DOM injection patterns).
- Functional behavior changes include tests (new or updated).
- New user-facing features are documented in `README.md` (`Funcionalidades`).
- Relevant build command passes.
- Reusable UI strings/constants were centralized where applicable.
- No dead code, no debug leftovers, no redundant comments.
- Update docs when behavior/config changed.

### When stuck

- Ask a concise clarifying question, or
- propose a short plan with explicit assumptions, then implement incrementally.
- Avoid large speculative changes without confirmation.

### Test first mode

- For regressions: add a failing test first, then fix to green.
- For every new behavior or functional change: add/update tests in the same PR before finalizing code.
- If automation is technically impossible for the scope, document why and provide a clear manual verification checklist.

### Nested AGENTS.md

- If a subdirectory contains its own `AGENTS.md`, the closest one to edited files takes precedence.
- Root `AGENTS.md` remains the baseline for repository-wide behavior.
