declare const colors: {
    readonly primary: {
        readonly DEFAULT: "var(--color-primary, #6366f1)";
        readonly hover: "var(--color-primary-hover, #4f46e5)";
        readonly active: "var(--color-primary-active, #4338ca)";
        readonly foreground: "var(--color-primary-foreground, #ffffff)";
    };
    readonly secondary: {
        readonly DEFAULT: "var(--color-secondary, #3b82f6)";
        readonly hover: "var(--color-secondary-hover, #2563eb)";
        readonly active: "var(--color-secondary-active, #1d4ed8)";
        readonly foreground: "var(--color-secondary-foreground, #ffffff)";
    };
    readonly accent: {
        readonly DEFAULT: "var(--color-accent, #10b981)";
        readonly hover: "var(--color-accent-hover, #059669)";
        readonly foreground: "var(--color-accent-foreground, #ffffff)";
    };
    readonly destructive: {
        readonly DEFAULT: "var(--color-destructive, #ef4444)";
        readonly hover: "var(--color-destructive-hover, #dc2626)";
        readonly active: "var(--color-destructive-active, #b91c1c)";
        readonly foreground: "var(--color-destructive-foreground, #ffffff)";
    };
    readonly surface: {
        readonly DEFAULT: "var(--color-surface, #1e293b)";
        readonly subtle: "var(--color-surface-subtle, #334155)";
        readonly raised: "var(--color-surface-raised, #0f172a)";
    };
    readonly background: {
        readonly DEFAULT: "var(--color-background, #090d16)";
        readonly alt: "var(--color-background-alt, #0f172a)";
    };
    readonly text: {
        readonly DEFAULT: "var(--color-text, #f8fafc)";
        readonly muted: "var(--color-text-muted, #94a3b8)";
        readonly inverse: "var(--color-text-inverse, #090d16)";
    };
    readonly border: {
        readonly DEFAULT: "var(--color-border, #334155)";
        readonly subtle: "var(--color-border-subtle, #1e293b)";
        readonly focus: "var(--color-border-focus, #6366f1)";
    };
};
type Colors = typeof colors;

declare const radii: {
    readonly none: "0px";
    readonly sm: "var(--radius-sm, 0.25rem)";
    readonly md: "var(--radius-md, 0.375rem)";
    readonly lg: "var(--radius-lg, 0.5rem)";
    readonly xl: "var(--radius-xl, 0.75rem)";
    readonly '2xl': "var(--radius-2xl, 1rem)";
    readonly full: "9999px";
};
type Radii = typeof radii;

declare const typography: {
    readonly fontFamily: {
        readonly sans: "var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif)";
        readonly mono: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)";
    };
    readonly fontSize: {
        readonly xs: "var(--font-size-xs, 0.75rem)";
        readonly sm: "var(--font-size-sm, 0.875rem)";
        readonly base: "var(--font-size-base, 1rem)";
        readonly lg: "var(--font-size-lg, 1.125rem)";
        readonly xl: "var(--font-size-xl, 1.25rem)";
        readonly '2xl': "var(--font-size-2xl, 1.5rem)";
        readonly '3xl': "var(--font-size-3xl, 1.875rem)";
    };
    readonly fontWeight: {
        readonly normal: "400";
        readonly medium: "500";
        readonly semibold: "600";
        readonly bold: "700";
    };
};
type Typography = typeof typography;

declare const tokens: {
    readonly colors: {
        readonly primary: {
            readonly DEFAULT: "var(--color-primary, #6366f1)";
            readonly hover: "var(--color-primary-hover, #4f46e5)";
            readonly active: "var(--color-primary-active, #4338ca)";
            readonly foreground: "var(--color-primary-foreground, #ffffff)";
        };
        readonly secondary: {
            readonly DEFAULT: "var(--color-secondary, #3b82f6)";
            readonly hover: "var(--color-secondary-hover, #2563eb)";
            readonly active: "var(--color-secondary-active, #1d4ed8)";
            readonly foreground: "var(--color-secondary-foreground, #ffffff)";
        };
        readonly accent: {
            readonly DEFAULT: "var(--color-accent, #10b981)";
            readonly hover: "var(--color-accent-hover, #059669)";
            readonly foreground: "var(--color-accent-foreground, #ffffff)";
        };
        readonly destructive: {
            readonly DEFAULT: "var(--color-destructive, #ef4444)";
            readonly hover: "var(--color-destructive-hover, #dc2626)";
            readonly active: "var(--color-destructive-active, #b91c1c)";
            readonly foreground: "var(--color-destructive-foreground, #ffffff)";
        };
        readonly surface: {
            readonly DEFAULT: "var(--color-surface, #1e293b)";
            readonly subtle: "var(--color-surface-subtle, #334155)";
            readonly raised: "var(--color-surface-raised, #0f172a)";
        };
        readonly background: {
            readonly DEFAULT: "var(--color-background, #090d16)";
            readonly alt: "var(--color-background-alt, #0f172a)";
        };
        readonly text: {
            readonly DEFAULT: "var(--color-text, #f8fafc)";
            readonly muted: "var(--color-text-muted, #94a3b8)";
            readonly inverse: "var(--color-text-inverse, #090d16)";
        };
        readonly border: {
            readonly DEFAULT: "var(--color-border, #334155)";
            readonly subtle: "var(--color-border-subtle, #1e293b)";
            readonly focus: "var(--color-border-focus, #6366f1)";
        };
    };
    readonly radii: {
        readonly none: "0px";
        readonly sm: "var(--radius-sm, 0.25rem)";
        readonly md: "var(--radius-md, 0.375rem)";
        readonly lg: "var(--radius-lg, 0.5rem)";
        readonly xl: "var(--radius-xl, 0.75rem)";
        readonly '2xl': "var(--radius-2xl, 1rem)";
        readonly full: "9999px";
    };
    readonly typography: {
        readonly fontFamily: {
            readonly sans: "var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif)";
            readonly mono: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)";
        };
        readonly fontSize: {
            readonly xs: "var(--font-size-xs, 0.75rem)";
            readonly sm: "var(--font-size-sm, 0.875rem)";
            readonly base: "var(--font-size-base, 1rem)";
            readonly lg: "var(--font-size-lg, 1.125rem)";
            readonly xl: "var(--font-size-xl, 1.25rem)";
            readonly '2xl': "var(--font-size-2xl, 1.5rem)";
            readonly '3xl': "var(--font-size-3xl, 1.875rem)";
        };
        readonly fontWeight: {
            readonly normal: "400";
            readonly medium: "500";
            readonly semibold: "600";
            readonly bold: "700";
        };
    };
};

export { type Colors, type Radii, type Typography, colors, radii, tokens, typography };
