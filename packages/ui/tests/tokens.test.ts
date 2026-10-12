import { describe, it, expect } from 'vitest';
import { tokens, colors, radii, typography } from '../src/tokens';

describe('Design Tokens', () => {
  it('exports semantic color tokens matching design variables', () => {
    expect(colors).toBeDefined();
    expect(colors.primary).toBeDefined();
    expect(colors.secondary).toBeDefined();
    expect(colors.accent).toBeDefined();
    expect(colors.destructive).toBeDefined();
    expect(colors.background).toBeDefined();
    expect(colors.surface).toBeDefined();
    expect(colors.text).toBeDefined();
    expect(colors.border).toBeDefined();
  });

  it('exports border radius scale', () => {
    expect(radii).toBeDefined();
    expect(radii.none).toBe('0px');
    expect(radii.sm).toBeDefined();
    expect(radii.md).toBeDefined();
    expect(radii.lg).toBeDefined();
    expect(radii.full).toBe('9999px');
  });

  it('exports typography definitions', () => {
    expect(typography).toBeDefined();
    expect(typography.fontFamily).toBeDefined();
    expect(typography.fontSize).toBeDefined();
    expect(typography.fontWeight).toBeDefined();
  });

  it('aggregates all tokens into master tokens export', () => {
    expect(tokens.colors).toEqual(colors);
    expect(tokens.radii).toEqual(radii);
    expect(tokens.typography).toEqual(typography);
  });
});
