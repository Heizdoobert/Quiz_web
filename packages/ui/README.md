# @heizdoobert/quickquiz-ui

A modular, accessible UI primitive SDK and centralized design token system for QuickQuiz applications.

## Features

- **Centralized Design Tokens**: Color palette, typography scales, radii, and shadows exported as TypeScript objects and standard CSS custom properties.
- **Accessible Primitives**: Built strictly with semantic HTML5 and ARIA patterns (`Button`, `Card`, `Badge`, `Input`, `Modal`).
- **Zero Runtime UI Dependencies**: Lightweight pure React 19 implementation without heavyweight UI frameworks or CSS-in-JS runtimes.
- **Flexible Bundling**: Dual ESM and CommonJS distributions with full TypeScript `.d.ts` declaration files.

## Installation / Usage

Within the `web_quiz` monorepo:

```tsx
import { Button, Card, Badge, Input, Modal, tokens } from '@heizdoobert/quickquiz-ui';
import '@heizdoobert/quickquiz-ui/styles.css';
```

## Primitives

- **Button**: Supports `primary`, `secondary`, `outline`, `ghost`, and `danger` variants, plus `sm`, `md`, `lg` sizes, loading spinners, and disabled states.
- **Card**: Modular card layout including `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`.
- **Badge**: Status indicators with `default`, `success`, `warning`, `danger`, and `outline` styles.
- **Input**: Accessible form inputs with label association, error messages, helper text, and icon slots.
- **Modal**: Accessible modal dialog with backdrop blur, focus handling, Escape key dismissal, and custom action footers.
- **Alert**: Feedback notice with `info`, `success`, `warning`, `error` types, optional title, description, custom icon, and dismissible close button.
- **Switch**: Accessible toggle switch with `checked`, `defaultChecked`, `onChange`, `sm`/`md` sizing, and full keyboard interaction (`Space`/`Enter`).
- **Tabs**: Tabbed navigation with `items`, active tab selection, arrow key navigation, panel rendering, and disabled tab handling.
- **Tooltip**: Hover and focus popup hints with `top`, `bottom`, `left`, `right` placements for accessible helper text.
