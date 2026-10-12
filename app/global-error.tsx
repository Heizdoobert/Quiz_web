'use client';

import { captureException } from '@/lib/sdk/sentry';
import { useEffect } from 'react';
import Error from './error';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <Error error={error} reset={reset} />
      </body>
    </html>
  );
}
