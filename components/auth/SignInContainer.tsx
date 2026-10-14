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
      subtitle: 'Sign in to access your profile, quizzes, and stats.',
    },
    'verify-email': {
      title: 'Verify Your Email',
      subtitle: 'Enter the 6-digit verification code sent to your email.',
    },
    'reset-password': {
      title: 'Reset Password',
      subtitle: 'Recover your account using a 6-digit recovery code.',
    },
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">{titles[view].title}</h1>
        <p className="text-xs text-slate-400">{titles[view].subtitle}</p>
      </div>

      {view === 'signin' && (
        <EmailPasswordForm
          initialEmail={email}
          onSuccess={handleSuccess}
          onForgotPassword={(em) => {
            if (em) setEmail(em);
            setView('reset-password');
          }}
          onRequiresVerification={(em) => {
            if (em) setEmail(em);
            setView('verify-email');
          }}
        />
      )}

      {view === 'verify-email' && (
        <OtpVerificationForm
          initialEmail={email}
          onSuccess={handleSuccess}
          onBack={() => setView('signin')}
        />
      )}

      {view === 'reset-password' && (
        <PasswordResetForm
          initialEmail={email}
          onSuccess={handleSuccess}
          onBack={() => setView('signin')}
        />
      )}
    </div>
  );
}
