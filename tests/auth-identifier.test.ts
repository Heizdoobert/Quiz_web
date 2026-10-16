// Tests for authentication using either email or username as identifier
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabaseAdmin } from '@/lib/sdk/supabase-admin'
import { signUpAccount, signInAccount } from '@/lib/services/credentials'

// Helper to clean up created users
async function deleteUser(userId: string) {
  await supabaseAdmin.from('auth.users').delete().eq('id', userId)
  await supabaseAdmin.from('public.usernames').delete().eq('user_id', userId)
}

describe('Auth identifier flow', () => {
  let emailUserId: string | null = null
  let usernameUserId: string | null = null

  afterAll(async () => {
    if (emailUserId) await deleteUser(emailUserId)
    if (usernameUserId) await deleteUser(usernameUserId)
  })

  it('signs up with email', async () => {
    const res = await signUpAccount('testemail@example.com', 'Password1')
    expect(res.ok).toBe(true)
    emailUserId = res.account.id
  })

  it('signs up with username', async () => {
    const res = await signUpAccount('testuser123', 'Password1')
    expect(res.ok).toBe(true)
    usernameUserId = res.account.id
  })

  it('prevents duplicate username', async () => {
    const res = await signUpAccount('testuser123', 'Password1')
    expect(res.ok).toBe(false)
    expect(res.error).toContain('already taken')
  })

  it('signs in with email', async () => {
    const res = await signInAccount('testemail@example.com', 'Password1')
    expect(res.ok).toBe(true)
    expect(res.account.id).toBe(emailUserId)
  })

  it('signs in with username', async () => {
    const res = await signInAccount('testuser123', 'Password1')
    expect(res.ok).toBe(true)
    expect(res.account.id).toBe(usernameUserId)
  })
})
