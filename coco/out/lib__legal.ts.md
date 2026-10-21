# lib/legal.ts
lines:14 exports:LEGAL_OPERATOR,LEGAL_CONTACT_EMAIL,assertLegalFilled
---
// Operator name and contact shown on the public policy pages (/privacy, /account-deletion).
// A production build refuses to ship values that start with TODO.
export const LEGAL_OPERATOR = 'Quick Quiz';
export const LEGAL_CONTACT_EMAIL = 'hhhuygiau@gmail.com';

export function assertLegalFilled(
  env: Record<string, string | undefined> = process.env,
  legal = { operator: LEGAL_OPERATOR, email: LEGAL_CONTACT_EMAIL },
): void {
  if (env.VERCEL_ENV !== 'production') return;
  if (legal.operator.startsWith('TODO') || legal.email.startsWith('TODO')) {
    throw new Error('lib/legal.ts: fill in the legal operator name and contact email before a production build');
  }
}
