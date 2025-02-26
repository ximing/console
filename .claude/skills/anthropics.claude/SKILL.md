---
name: anthropics.claude
description: Use when users ask how Claude Code loads `CLAUDE.md`, `.claude/rules/`, `CLAUDE.local.md`, imports, or auto memory; when they want instructions to load progressively instead of all at once; or when they need to design path-scoped guidance, nested instruction files, or on-demand context with the right loading behavior across a project.
---

# Claude Loading and Progressive Context

Help users understand Claude Code's loading mechanism first, then design instruction files so context appears at the right time instead of all at once.

## Core goal

This skill is mainly about two things:
- how Claude Code loads persistent instructions
- how to write instruction files so they load progressively

Do not spend most of the answer explaining general skill triggering. Focus on load order, scope, and file layout.

## The loading model

Explain Claude Code's loading behavior in this order.

### 1. Startup load from the current working directory upward

At session start, Claude walks up from the current working directory and loads:
- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- unscoped files under `.claude/rules/`

Important behavior:
- ancestor files are concatenated, not replaced
- more specific files do not override by magic; they are simply added later in context
- `CLAUDE.local.md` is appended after `CLAUDE.md` at the same directory level

### 2. Nested files load on demand

Instruction files inside subdirectories are not always loaded at startup.

They load when Claude reads files in that subtree. This is the key to progressive loading.

Examples:
- `packages/a/CLAUDE.md` loads when Claude starts reading files under `packages/a/`
- `src/components/CLAUDE.md` loads when Claude works with files under `src/components/`
- a rule with `paths: ["src/api/**/*.ts"]` loads when Claude reads matching files

### 3. Imports expand with the file that imports them

If a `CLAUDE.md` contains `@path/to/file`, the imported file is expanded together with that `CLAUDE.md`.

Implication:
- imports are not a progressive-loading mechanism by themselves
- if you import a large file from a startup-loaded `CLAUDE.md`, that content also comes in at startup
- use imports for maintenance and reuse, not as your main lazy-loading strategy

### 4. Auto memory has its own loading rule

Auto memory is separate from `CLAUDE.md`.

Important behavior:
- `MEMORY.md` loads only its first 200 lines or first 25KB at startup
- other memory topic files are read on demand
- this makes auto memory naturally more progressive than a huge root `CLAUDE.md`

## Progressive loading strategy

If the user says they want "渐进式加载", recommend this design by default.

### Keep the root file thin

Put only stable, global instructions in the root-level `CLAUDE.md`:
- core project conventions
- common commands
- repo-wide non-negotiable rules
- a short map of where more specific rules live

Do not dump every subsystem detail into the root file.

### Push domain rules downward

Move area-specific instructions closer to the files they govern.

Good examples:
- `packages/logger/CLAUDE.md`
- `reactive-state/react/CLAUDE.md`
- `src/components/CLAUDE.md`

This ensures Claude only loads those details when it starts working in that area.

### Use path-scoped rules for cross-cutting but selective guidance

Use `.claude/rules/*.md` with `paths` when the rule is about a file pattern rather than a directory owner.

Example:

```markdown
---
paths:
  - "src/**/*.{ts,tsx}"
  - "tests/**/*.test.ts"
---

# TypeScript Rules
- Prefer explicit return types for exported APIs.
- Keep test fixtures close to the test file.
```

This is a strong way to achieve progressive loading without creating many nested `CLAUDE.md` files.

### Use imports sparingly

Use `@...` imports when:
- the content must always travel with the parent file
- you want shared maintenance across files
- the imported content is still appropriate for the same loading moment

Avoid imports when the real goal is lazy loading.

## How to write for progressive loading

When helping the user author files, apply these rules.

### Root `CLAUDE.md`

Keep it short and global.

Good contents:
- project architecture summary
- build and test entry commands
- repo-wide naming or review rules
- pointers such as `API-specific guidance lives under .claude/rules/api.md`

Bad contents:
- every package's local conventions
- detailed framework-specific instructions for areas Claude may never touch
- long procedural workflows better represented as skills

### Nested `CLAUDE.md`

Use nested files when instructions belong to one subtree and should appear only when Claude enters that area.

Good pattern:

```markdown
# React Package Notes
- Use `useService` for service access.
- Keep platform adapters under `src/platforms/`.
- Prefer observer-based rendering for stateful views.
```

Write only what is unique to that subtree. Do not repeat root-level rules unless the local clarification is necessary.

### `.claude/rules/*.md`

Use rules when the concern is pattern-based rather than folder-based.

Good for:
- all `*.test.ts`
- all API handlers
- all React components
- all markdown docs under one area

If the file has no `paths`, it loads broadly. If the user wants progressive loading, make sure the rule actually has `paths`.

## Recommended decision table

| Goal | Best mechanism |
| --- | --- |
| Everyone should always see it | root `CLAUDE.md` |
| Only one subtree should see it | nested `CLAUDE.md` |
| Only matching file patterns should see it | `.claude/rules` with `paths` |
| Reusable workflow, not persistent guidance | skill |
| Personal repo-only note | `CLAUDE.local.md` |
| Personal learned history | auto memory |

## A concrete progressive layout

If the user asks "我希望渐进式加载应该怎么写", suggest a structure like this:

```text
repo/
├── CLAUDE.md
├── .claude/
│   └── rules/
│       ├── api.md
│       └── tests.md
├── reactive-state/
│   ├── react/
│   │   └── CLAUDE.md
│   └── service/
│       └── CLAUDE.md
└── packages/
    └── logger/
        └── CLAUDE.md
```

And explain it like this:
- root `CLAUDE.md`: only repo-wide baseline guidance
- `reactive-state/react/CLAUDE.md`: React package details, loaded when work enters that package
- `packages/logger/CLAUDE.md`: logger-specific conventions, loaded only when needed
- `.claude/rules/api.md`: path-scoped cross-cutting API guidance
- `.claude/rules/tests.md`: path-scoped test guidance

## Response pattern

When answering, prefer this sequence:
1. Explain the actual load order.
2. Point out which parts load immediately and which load later.
3. Recommend a file layout for progressive loading.
4. If editing files, keep root instructions thin and move specifics downward.
5. Mention imports only if they genuinely help, and warn that imports are not lazy-loading.

## Debugging progressive loading

If the user's setup is not behaving as expected, check these points:
1. Is the file located in a directory Claude actually entered?
2. Is the rule missing a `paths` frontmatter block?
3. Did a root `CLAUDE.md` import a huge file, causing eager loading?
4. Is the instruction duplicated in both root and nested files, making scope unclear?
5. Is the user expecting nested files to load at startup when they only load after entering that subtree?
6. Does `/memory` show the expected instruction files as loaded?

## Boundaries

Do not turn this skill into a generic explanation of all Claude Code features. Keep the emphasis on:
- loading order
- progressive loading
- file placement strategy
- practical authoring patterns for `CLAUDE.md` and `.claude/rules/`
