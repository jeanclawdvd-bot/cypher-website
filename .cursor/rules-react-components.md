# React Component Rules (Codex)

These rules define how we build UI, components, and front-end architecture.

## GENERAL

- Use React + TypeScript only
- Function components only
- One component = one responsibility
- If not describable in one sentence, split it
- Prefer composition over configuration
- Avoid unnecessary abstraction

## PROPS

- Props must be strongly typed
- Avoid boolean soup
- Prefer discriminated unions or variant props over multiple booleans
- Controlled components use `value` + `onChange`
- Uncontrolled components use `defaultValue`
- Prefer `children`, slots, and subcomponents over flags

## STATE AND EFFECTS

- Keep state closest to where it is used
- Do not lift state prematurely
- Render must be pure
- Side effects only in hooks (`useEffect`, `useLayoutEffect`, custom hooks)
- Derive state instead of duplicating it
- Prefer computed values over extra `useState`

## ARCHITECTURE

- Separate data orchestration from presentation
- Container or orchestrator components fetch data and handle domain orchestration
- Presentational components render UI and accept data via props
- Shared UI must not know about routing, global stores, or backend concerns
- Apps own pages, data fetching, and domain logic
- Features provide reusable functionality across apps
- Feature components may depend on app store but not app components

## FOLDER STRUCTURE RULES

- Organize by app first, then by feature
- Apps may depend on features and shared
- Features may depend on shared
- Shared must not depend on apps or features
- If a component is used only once, keep it in the app

## EXPECTED FRONT-END STRUCTURE

- All components have their own folder with TSX, CSS modules, tests, and `index.ts`

## COMPONENT STRUCTURE

- Components must have their own folder
- One component per file
- Modular CSS per component
- `index.ts` re-exports only and contains no logic

Expected folder shape:

```text
Component/
  Component.tsx
  Component.module.css
  Component.test.tsx
  index.ts
```

## STYLING

- Styles are local by default
- No inline styles except for dynamic runtime values
- Global CSS is only for reset, typography, tokens, and theme
- Use design tokens instead of hardcoded values
- Prefer ZUI primitives and theming as the default UI layer

## NAMING

- App components use domain-specific names
- Feature components use functionality-specific names
- Shared UI uses generic names
- Do not genericize until reused

## TESTABILITY

- Move complex logic to hooks or utilities
- Components should primarily render UI
- Prefer deterministic rendering
- Keep side effects isolated and mockable

## ACCESSIBILITY AND UX BASELINES

- Use semantic HTML where possible
- Buttons must be `<button>`
- Inputs must have accessible labels or `aria-label`
- Do not block keyboard navigation
- Keep focus states visible

## PERFORMANCE

- Avoid premature memoization
- Use memoization only when it is proven to help
- Keep re-renders localized by keeping state local and components small
