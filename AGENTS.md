# Repository Guidelines

## Project Structure & Module Organization

DailyFlow-Ts is an Electron, React, and TypeScript desktop app. The React renderer lives in `src/ui`, with pages in `src/ui/Pages`, reusable components in `src/ui/components`, Redux store code in `src/ui/store`, and UI helpers in `src/ui/helpers`. Electron main-process code is in `src/electron`, while shared utilities and IPC helpers are in `src/shared`. Common enums are in `src/enums`, static app assets are split between `src/assets` and `src/ui/assets`, and sample/local JSON data is under `localdata`.

## Build, Test, and Development Commands

- `npm install`: install project dependencies from `package-lock.json`.
- `npm run dev`: run Vite and Electron together for local desktop development.
- `npm run dev:react`: run only the Vite renderer dev server.
- `npm run transpile:electron`: compile Electron main/preload TypeScript using `src/electron/tsconfig.json`.
- `npm run build`: type-check with `tsc` and build the renderer with Vite.
- `npm run dist:win`, `npm run dist:mac`, `npm run dist:linux`: create platform installers with Electron Builder.

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode enabled. Follow the existing React component pattern: PascalCase component folders/files such as `TaskPlayer/TaskPlayer.tsx`, paired CSS files, and camelCase helpers such as `util.jsondata.ts` or `alertService.ts`. Keep imports compatible with the `~/*` alias for `src/*` when it improves readability. Prefer small, typed helpers over untyped object passing, and keep Electron-specific APIs behind preload/shared utilities.

## Testing Guidelines

There is no active test suite in this repo yet. When adding tests, place them near the source they cover and name them after the behavior being verified, for example `TaskPlayer.test.tsx`. Run `npm run build` before packaging changes or opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short, lowercase summaries such as `update`, `fix logic`, and `update css`. Keep commits brief but more specific when possible, for example `fix task timer reset`. Pull requests should describe the user-facing change, list verification commands run, link related issues, and include screenshots or short clips for visible UI changes.

## Security & Configuration Tips

Do not commit generated builds, secrets, or private local data. Treat `localdata` as development/sample data unless a change intentionally updates defaults. Keep persistence and filesystem access in Electron or shared utility layers rather than directly inside React components.
