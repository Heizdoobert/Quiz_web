# components/auth/SignInContainer.tsx
lines:92 exports:default
---
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/shared/use-session';
import { sanitizeRedirectUrl } from '@/lib/utils/redirect';
import EmailPasswordForm from './forms/EmailPasswordForm';
import OtpVerificationForm from './forms/OtpVerificationForm';
import PasswordResetForm from './forms/PasswordResetForm';

type AuthView = 'signin' | 'verify-email' | 'reset-password';

interface SignInContainerProps {
  initialRedirect?: string;
}

export default function SignInContainer({ initialRedirect }: SignInContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useSession();

  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');

  const rawRedirect = initialRedirect ?? searchParams?.get('redirect');
  const safeRedirect = sanitizeRedirectUrl(rawRedirect, '/profile');

  const handleSuccess = async () => {
    try {
      await refresh();
    } catch {
      // Continue even if session refresh errors non-fatally
    }
    router.replace(safeRedirect);
    router.refresh();
  };

  const titles: Record<AuthView, { title: string; subtitle: string }> = {
    signin: {
      title: 'Welcome Back',
