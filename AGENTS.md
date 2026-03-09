# AGENTS.md - Developer Guide for AI Agents

This document provides context for AI agents operating in this repository.

## Project Overview

OpenCodeUI is a third-party web frontend for OpenCode (an AI coding assistant). It's built with React 19, TypeScript, Vite, and Tauri for desktop deployment.

## Tech Stack

| Category   | Technology               |
| ---------- | ------------------------ |
| Framework  | React 19 + TypeScript    |
| Build      | Vite 7                   |
| Styling    | Tailwind CSS v4          |
| Testing    | Vitest + Testing Library |
| Desktop    | Tauri 2                  |
| Linting    | ESLint 9                 |
| Formatting | Prettier 3               |

---

## Build & Development Commands

### Development

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run preview      # Preview production build
```

### Type Checking

```bash
npm run typecheck    # TypeScript compiler check (tsc -b)
```

### Linting & Formatting

```bash
npm run lint         # Run ESLint
npm run format       # Format code with Prettier (writes changes)
npm run format:check # Check formatting without writing
```

### Testing

```bash
npm run test         # Run tests in watch mode
npm run test:run    # Run tests once (CI-friendly)
```

### Running a Single Test

```bash
npm run test:run -- src/hooks/useSessions.test.tsx    # Run specific file
npm run test:run -- --testNamePattern="useSessions"   # Run tests matching name
```

### Full Validation

```bash
npm run validate     # typecheck + lint + test:run + build
npm run check        # format:check + lint + test:run + build
```

### Build

```bash
npm run build        # Production build (tsc -b && vite build)
```

### Tauri Desktop App

```bash
npm run tauri build  # Build desktop application
```

---

## Code Style Guidelines

### Formatting (Prettier)

- **Semicolons**: No
- **Quotes**: Single quotes
- **Trailing commas**: All
- **Arrow parens**: Avoid when possible
- **Print width**: 120 characters

### Editor Config

- Indent: 2 spaces
- Line endings: LF
- UTF-8 charset
- Trim trailing whitespace
- Insert final newline

### TypeScript Strictness

The project uses strict TypeScript with these settings:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `verbatimModuleSyntax: true` (use `import type` explicitly)

**Never use type suppression** (`as any`, `@ts-ignore`, `@ts-expect-error`).

### ESLint Rules

Key rules enforced:

- `prefer-const` (warn)
- `@typescript-eslint/no-explicit-any` (warn)
- `@typescript-eslint/no-unused-vars` (warn) - prefix with `_` to ignore
- React hooks rules (exhaustive-deps, immutability, use-memo)

---

## Project Structure

```
src/
├── api/                 # API client functions (OpenCode backend)
│   ├── client.ts        # Main client exports
│   ├── http.ts          # HTTP utilities
│   ├── types.ts         # API type definitions
│   └── *.ts             # Domain-specific API modules
├── components/         # Reusable UI components
│   ├── ui/              # Basic UI components (Button, Dialog, etc.)
│   └── *.tsx            # Complex components
├── features/            # Feature-based modules
│   ├── chat/            # Chat interface
│   ├── message/         # Message rendering
│   ├── sessions/        # Session management
│   ├── settings/        # Settings panel
│   ├── mention/         # @ mention functionality
│   ├── slash-command/   # / command functionality
│   └── attachment/      # File attachment handling
├── hooks/               # Custom React hooks
├── store/               # State management (Zustand-style stores)
├── themes/              # Theme presets (Eucalyptus, Claude, Breeze)
├── utils/               # Utility functions
├── constants/           # App constants
├── contexts/            # React contexts
├── types/               # TypeScript types
└── test/                # Test setup and utilities
```

---

## Conventions

### File Organization

- **Barrel exports**: Use `index.ts` files to re-export from modules
- **Colocated tests**: Test files sit next to source files (`useSessions.test.tsx` next to `useSessions.ts`)
- **Component files**: Use `.tsx` extension for components, `.ts` for utilities/hooks

### Naming Conventions

- **Components**: PascalCase (`ChatArea.tsx`, `Dialog.tsx`)
- **Hooks**: camelCase with `use` prefix (`useSessions.ts`)
- **Utilities**: camelCase (`clipboard.ts`, `directoryUtils.ts`)
- **Types/Interfaces**: PascalCase, often with suffix (`ModelInfo`, `ApiProject`)

### Import Patterns

```typescript
// Relative imports for same-feature code
import { useSessions } from '../hooks/useSessions'

// Absolute imports for cross-feature code
import { getSessions } from '@/api'
import { serverStore } from '@/store'
```

### Error Handling

- Use explicit error messages
- Throw `Error` with descriptive messages
- Handle async errors with try/catch at call sites

### JSDoc Comments

Use JSDoc for exported functions, especially API clients:

```typescript
/**
 * GET /project/current - 获取当前项目
 */
export async function getCurrentProject(directory?: string): Promise<ApiProject>
```

### Testing Patterns

```typescript
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock API modules
vi.mock('../api', () => ({
  getSessions: vi.fn(),
}))

// Use fake timers for time-dependent tests
vi.useFakeTimers()
// ... test code ...
vi.useRealTimers()
```

---

## Git & CI

### Commit Validation

Before committing, run:

```bash
npm run validate
```

This is what CI runs on PRs and main branch pushes.

### GitHub Workflows

- **Build Validation** (`.github/workflows/build.yml`): Runs `npm run validate` on PR and main push

---

## Environment

- **Node.js**: 22 (see `.tool-versions`)
- **Package manager**: npm (ES modules - `type: "module"`)
