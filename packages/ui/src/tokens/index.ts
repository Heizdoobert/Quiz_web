import { colors, type Colors } from './colors';
import { radii, type Radii } from './radii';
import { typography, type Typography } from './typography';

export const tokens = {
  colors,
  radii,
  typography,
} as const;

export { colors, radii, typography };
export type { Colors, Radii, Typography };
