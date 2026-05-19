# Repository Guidelines

## Project Structure & Module Organization

DailyFlow-Ts is an Electron, React, and TypeScript desktop app. The React renderer lives in `src/ui`, with pages in `src/ui/Pages`, reusable components in `src/ui/components`, Redux store code in `src/ui/store`, and UI helpers in `src/ui/helpers`. Electron main-process code is in `src/electron`, while shared utilities and IPC helpers are in `src/shared`. Common enums are in `src/enums`, static app assets are split between `src/assets` and `src/ui/assets`, and sample/local JSON data is under `localdata`.

## Build, Test, and Development Commands

- `npm install`: install project dependencies from `package-lock.json`.
- `npm run dev`: run Vite and Electron together for local desktop development.
- `npm run dev:react`: run only the Vite renderer dev server.
- `npm run transpile:electron`: compile Electron main/preload TypeScript using `src/electron/tsconfig.json`.
- `npm run build`: type-check with `tsc` and build the renderer with Vite.
- `npm run test:unit`: run Vitest unit tests under `src`.
- `npm run dist:win`, `npm run dist:mac`, `npm run dist:linux`: create platform installers with Electron Builder.

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode enabled. Follow the existing React component pattern: PascalCase component folders/files such as `TaskPlayer/TaskPlayer.tsx`, paired CSS files, and camelCase helpers such as `util.jsondata.ts` or `alertService.ts`. Keep imports compatible with the `~/*` alias for `src/*` when it improves readability. Prefer small, typed helpers over untyped object passing, and keep Electron-specific APIs behind preload/shared utilities.

## Testing Guidelines

Use Vitest for focused unit tests near source code under `src`. Name tests after the behavior being verified, for example `scheduleUtils.test.ts`. Run `npm run build` before packaging changes or opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short, lowercase summaries such as `update`, `fix logic`, and `update css`. Keep commits brief but more specific when possible, for example `fix task timer reset`. Pull requests should describe the user-facing change, list verification commands run, link related issues, and include screenshots or short clips for visible UI changes.

## Security & Configuration Tips

Do not commit generated builds, secrets, or private local data. Treat `localdata` as development/sample data unless a change intentionally updates defaults. Keep persistence and filesystem access in Electron or shared utility layers rather than directly inside React components.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **DailyFlow-Ts** (1543 symbols, 3036 relationships, 132 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/DailyFlow-Ts/context` | Codebase overview, check index freshness |
| `gitnexus://repo/DailyFlow-Ts/clusters` | All functional areas |
| `gitnexus://repo/DailyFlow-Ts/processes` | All execution flows |
| `gitnexus://repo/DailyFlow-Ts/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
