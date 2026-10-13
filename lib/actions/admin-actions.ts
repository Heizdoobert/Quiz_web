'use server';

import { setConfigValue } from '../services/config-admin';
import { listQuarantinedQuestions, resolveQuestionDispute } from '../services/moderation';
import { listAccountsForAdmin, setAccountRole } from '../services/role-admin';

// Every export here is a public endpoint, so none takes an account: each service called below
// authorizes from the session cookie.

export async function updateConfigAction(key: string, value: unknown) {
  return setConfigValue({ key, value });
}

export async function listAccountsAction(search: string, offset: number) {
  return listAccountsForAdmin({ search, limit: 20, offset });
}

export async function setRoleAction(accountId: string, role: string) {
  return setAccountRole({ accountId, role });
}

export async function listQuarantineAction(offset: number) {
  return listQuarantinedQuestions({ limit: 20, offset });
}

export async function resolveQuarantineAction(questionId: string, outcome: string, note: string) {
  return resolveQuestionDispute({ questionId, outcome, note });
}
