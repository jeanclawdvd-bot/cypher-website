# TypeScript Rules (Codex)

These rules apply to all TypeScript code in this repo, including React code, unless a more specific rule overrides them.

## GENERAL

- Use TypeScript everywhere
- Do not use `any` unless explicitly justified
- Prefer simple, readable code over cleverness
- Keep responsibilities small
- If a function cannot be described in one sentence, split it
- Prefer composition over configuration
- Do not introduce generic frameworks or utility layers until there are at least two real call sites

## TYPES

- Prefer `type` aliases for unions and intersections
- Use `interface` for public object shapes meant to be extended
- Avoid `enum` unless external requirements demand it
- Prefer string literal unions
- Prefer explicit return types for exported functions, hooks, and public APIs
- Use `unknown` instead of `any` for untrusted input, then narrow with type guards
- Do not use non-null assertions as a shortcut

## NAMING

- Use meaningful names
- Domain types: `Project`, `Spec`, `Task`
- DTO and API shapes: `ProjectDto`, `TaskResponse`
- UI models only when truly needed
- Avoid generic names like `Data`, `Info`, or `Item` unless tightly scoped

## FUNCTIONS AND MODULES

- Prefer pure functions where possible
- Keep modules cohesive
- A file should have one primary purpose
- Avoid kitchen-sink utility files
- Prefer `readonly` data where feasible
- Prefer `const` over `let`

## ERROR HANDLING

- Use typed error shapes where possible
- Prefer structured results over throwing for expected failures
- Throw only for exceptional cases and broken invariants

## ASYNC

- Prefer `async` and `await`
- Do not fire-and-forget promises unless explicitly intended
- Handle promise errors
- Use `Promise.all` carefully for parallel work

## DATA VALIDATION

- Validate external inputs at boundaries
- Validate API responses, user inputs, and URL params
- Narrow types after validation

## IMPORTS

- Prefer absolute imports when configured
- Avoid circular dependencies
- Shared must not import from apps or features
- Features must not import from apps

## TESTABILITY

- Move complex logic into pure functions or small utilities
- Keep side effects at the edges
- Prefer deterministic code paths

## LINT AND FORMAT

- No TypeScript errors
- No unused exports
- No dead code
- Keep the codebase consistent with repo formatting and linting
