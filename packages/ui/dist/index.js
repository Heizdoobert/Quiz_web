"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  colors: () => colors,
  radii: () => radii,
  tokens: () => tokens,
  typography: () => typography
});
module.exports = __toCommonJS(index_exports);

// src/tokens/colors.ts
var colors = {
  primary: {
    DEFAULT: "var(--color-primary, #6366f1)",
    hover: "var(--color-primary-hover, #4f46e5)",
    active: "var(--color-primary-active, #4338ca)",
    foreground: "var(--color-primary-foreground, #ffffff)"
  },
  secondary: {
    DEFAULT: "var(--color-secondary, #3b82f6)",
    hover: "var(--color-secondary-hover, #2563eb)",
    active: "var(--color-secondary-active, #1d4ed8)",
    foreground: "var(--color-secondary-foreground, #ffffff)"
  },
  accent: {
    DEFAULT: "var(--color-accent, #10b981)",
    hover: "var(--color-accent-hover, #059669)",
    foreground: "var(--color-accent-foreground, #ffffff)"
  },
  destructive: {
    DEFAULT: "var(--color-destructive, #ef4444)",
    hover: "var(--color-destructive-hover, #dc2626)",
    active: "var(--color-destructive-active, #b91c1c)",
    foreground: "var(--color-destructive-foreground, #ffffff)"
  },
  surface: {
    DEFAULT: "var(--color-surface, #1e293b)",
    subtle: "var(--color-surface-subtle, #334155)",
    raised: "var(--color-surface-raised, #0f172a)"
  },
  background: {
    DEFAULT: "var(--color-background, #090d16)",
    alt: "var(--color-background-alt, #0f172a)"
  },
  text: {
    DEFAULT: "var(--color-text, #f8fafc)",
    muted: "var(--color-text-muted, #94a3b8)",
    inverse: "var(--color-text-inverse, #090d16)"
  },
  border: {
    DEFAULT: "var(--color-border, #334155)",
    subtle: "var(--color-border-subtle, #1e293b)",
    focus: "var(--color-border-focus, #6366f1)"
  }
};

// src/tokens/radii.ts
var radii = {
  none: "0px",
  sm: "var(--radius-sm, 0.25rem)",
  md: "var(--radius-md, 0.375rem)",
  lg: "var(--radius-lg, 0.5rem)",
  xl: "var(--radius-xl, 0.75rem)",
  "2xl": "var(--radius-2xl, 1rem)",
  full: "9999px"
};

// src/tokens/typography.ts
var typography = {
  fontFamily: {
    sans: 'var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    mono: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)"
  },
  fontSize: {
    xs: "var(--font-size-xs, 0.75rem)",
    sm: "var(--font-size-sm, 0.875rem)",
    base: "var(--font-size-base, 1rem)",
    lg: "var(--font-size-lg, 1.125rem)",
    xl: "var(--font-size-xl, 1.25rem)",
    "2xl": "var(--font-size-2xl, 1.5rem)",
    "3xl": "var(--font-size-3xl, 1.875rem)"
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700"
  }
};

// src/tokens/index.ts
var tokens = {
  colors,
  radii,
  typography
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  colors,
  radii,
  tokens,
  typography
});
//# sourceMappingURL=index.js.map