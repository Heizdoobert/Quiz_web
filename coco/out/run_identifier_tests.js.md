# run_identifier_tests.js
lines:42 exports:
---
// run_identifier_tests.js
// Simple script to manually verify the identifier authentication flow without using vitest.

import { signUpAccount, signInAccount } from './lib/services/credentials.ts';

async function main() {
  console.log('Running identifier flow checks...');
  // 1. Sign up with email
  const emailRes = await signUpAccount('testemail@example.com', 'Password1');
  console.log('signUpAccount(email):', emailRes);

  // 2. Sign up with username
  const userRes = await signUpAccount('testuser123', 'Password1');
  console.log('signUpAccount(username):', userRes);

  // 3. Attempt duplicate username sign‑up
  const dupRes = await signUpAccount('testuser123', 'Password1');
  console.log('signUpAccount(duplicate username):', dupRes);

  // 4. Sign in with email
  const emailSignIn = await signInAccount('testemail@example.com', 'Password1');
  console.log('signInAccount(email):', emailSignIn);

  // 5. Sign in with username
  const userSignIn = await signInAccount('testuser123', 'Password1');
  console.log('signInAccount(username):', userSignIn);

  // Simple pass/fail evaluation
  const passed =
    emailRes.ok &&
    userRes.ok &&
    !dupRes.ok &&
    dupRes.error?.toLowerCase().includes('taken') &&
    emailSignIn.ok &&
    userSignIn.ok;

  console.log('\nOverall result:', passed ? 'PASS' : 'FAIL');
}

main().catch(err => {
