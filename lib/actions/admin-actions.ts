'use server';

import { setConfigValue } from '../services/config-admin';

// Every export here is a public endpoint, so none takes an account: each service called below
// authorizes from the session cookie.

export async function updateConfigAction(key: string, value: unknown) {
  return setConfigValue({ key, value });
}
