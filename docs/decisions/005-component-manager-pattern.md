# ADR-005: Adopt Component Manager Pattern for UI Code Splitting

## Status
Accepted

## Date
2026-10-05

## Context
Our project enforces a strict architectural constraint (`CONSTRAINTS.md` rule `C2`) requiring UI components to stay under 200 lines of code. This forces components to adhere to the Single Responsibility Principle, keeps the Git history readable, and makes components easier for AI agents to reason about without exhausting context windows.

However, as the application grew, 8 legacy monolithic UI components (including Modals, QuizLayout, MyListsDashboard, and ContestPlay) exceeded this limit, bloating up to 630 lines. These were temporarily bypassed using `/* eslint-disable max-lines */`. We needed a strategy to refactor these complex components without introducing regressions or losing the colocation of complex state.

## Decision
We adopted the **Component Manager Pattern** to split monolithic UI files. 
Under this pattern, the original large component acts exclusively as a "Manager" or "Orchestrator":
1. **State Ownership**: The manager component retains all complex state logic (`useState`, `useReducer`), hooks, and event handlers.
2. **Sub-components**: Layout, presentation, and distinct logical sections (tabs, forms, lists) are extracted into pure, presentational child components placed in a co-located directory (e.g. splitting `components/modals/GroupModal.tsx` into `components/modals/group/GroupList.tsx` and `GroupForms.tsx`).
3. **Prop Drilling**: The manager passes state and handlers down to the child components as props.
4. **Thin Layer**: The manager file itself is reduced to primarily hook invocations and a thin JSX structural wrapper.

All 8 monolithic components were successfully migrated using this pattern, enabling us to remove the `eslint-disable max-lines` overrides and clear the exceptions from `CONSTRAINTS.md`.

## Alternatives Considered
- **Custom Hooks**: Extracting logic into `useMyListsDashboard()` hooks instead of splitting JSX. *Rejected* because the main issue was JSX bloat (presentation complexity), not just logic complexity. Combining custom hooks with the Component Manager Pattern is acceptable, but custom hooks alone wouldn't solve the JSX line count constraints.
- **Micro-frontends / Iframes**: Overkill for standard React UI complexity.
- **Raising the 200-line constraint**: *Rejected* because relaxing constraints degrades code quality over time. The 200-line limit forces good design boundaries.

## Consequences
- **Positive**: All UI components are now strictly under 200 lines.
- **Positive**: Presentational components are easier to unit test independently of their state management context.
- **Positive**: File size reduction significantly lowers the cognitive load for engineers and token usage for AI agents.
- **Negative**: Slight increase in prop drilling, which is an acceptable trade-off for better file-level encapsulation.
- **Convention**: Future UI development must inherently follow the Component Manager Pattern when a view grows complex, isolating layout structures into sibling files before the 200-line limit is reached.
